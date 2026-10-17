// Pruebas locales de préstamos (fase 1) con un DynamoDB en memoria (sin AWS ni red).
// Se corren en modo VTL, que es como está montado el API REST: npm test
process.env.INTEGRATION_MODE = 'vtl';

import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { dynamo, env } from '../src/shared';
import { handler as simulateLoan } from '../src/simulate-loan';
import { handler as requestLoan } from '../src/request-loan';
import { handler as listLoanRequests } from '../src/list-loan-requests';
import { handler as getMyLoans } from '../src/get-my-loans';
import { handler as decideLoan } from '../src/decide-loan';

type Row = Record<string, any>;
let tables: Record<string, Row[]> = {};
const keysOf: Record<string, string[]> = {
  [env.natillerasTable]: ['natilleraId'],
  [env.recordsTable]: ['natilleraId', 'id'],
  [env.loansTable]: ['requestId'],
};
const rows = (t: string) => (tables[t] ??= []);
const sameKey = (t: string, a: Row, b: Row) => keysOf[t].every((k) => a[k] === b[k]);
const cond = () => Object.assign(new Error('cond'), { name: 'ConditionalCheckFailedException' });

// Solo lo que usa domain.ts: Get, Put (+attribute_not_exists), Query (tabla o índice), Scan con contains,
// Update condicional del status.
(dynamo as any).send = async (cmd: any) => {
  const name = cmd.constructor.name as string;
  const i = cmd.input;
  const t = i.TableName as string;
  switch (name) {
    case 'GetCommand':
      return { Item: structuredClone(rows(t).find((r) => sameKey(t, r, i.Key))) };
    case 'PutCommand': {
      if (rows(t).some((r) => sameKey(t, r, i.Item)) && i.ConditionExpression?.includes('attribute_not_exists')) throw cond();
      rows(t).push(structuredClone(i.Item));
      return {};
    }
    case 'QueryCommand': {
      const [field] = (i.KeyConditionExpression as string).split(' = ');
      const value = Object.values(i.ExpressionAttributeValues)[0];
      return { Items: rows(t).filter((r) => r[field] === value).map((r) => structuredClone(r)) };
    }
    case 'ScanCommand': {
      const u = i.ExpressionAttributeValues[':u'];
      return { Items: rows(t).filter((r) => r.integrants?.includes(u)).map((r) => structuredClone(r)) };
    }
    case 'UpdateCommand': {
      const row = rows(t).find((r) => sameKey(t, r, i.Key));
      if (!row || row.status !== i.ExpressionAttributeValues[':pending']) throw cond();
      Object.assign(row, { status: i.ExpressionAttributeValues[':rejected'], decidedAt: i.ExpressionAttributeValues[':now'], decidedBy: i.ExpressionAttributeValues[':admin'] });
      return {};
    }
  }
  throw new Error(`fake dynamo: ${name} no implementado`);
};

const ev = (username: string, extra: Row = {}) => ({ auth: { username, sub: `sub-${username}` }, ...extra });
const fails = async (p: Promise<unknown>, status: number, error: string) =>
  assert.rejects(p, (e: Error) => e.message.startsWith(`[${status}]`) && e.message.includes(`"${error}"`));
const eur = (value: string) => ({ value, assetCode: 'EUR', assetScale: 2 });

beforeEach(() => {
  tables = {};
  rows(env.natillerasTable).push({ natilleraId: 'n1', author: 'rosa', integrants: ['rosa', 'luz', 'andres'], assetCode: 'EUR', assetScale: 2, disbursedTotal: '1000' });
  // Fondo: 66,00 € de aportes − 10,00 € ya prestados = 56,00 € disponibles.
  rows(env.recordsTable).push(
    { natilleraId: 'n1', id: 1, author: 'rosa', amount: eur('3300') },
    { natilleraId: 'n1', id: 2, author: 'luz', amount: eur('3300') },
    { natilleraId: 'n1', id: 3, author: 'luz', amount: { value: '999999', assetCode: 'COP', assetScale: 2 } }, // otra moneda: no suma
  );
});

test('simular: cuotas exactas, interés sobre el saldo, sin floats', async () => {
  const sim: any = await simulateLoan(ev('luz', { params: { value: '10000', assetCode: 'EUR', assetScale: '2', installments: '3' } }));
  assert.deepEqual(sim.schedule.map((i: any) => i.capital.value), ['3333', '3333', '3334']);
  // 1 % del saldo: 100,00 → 1,00 · 66,67 → 0,67 · 33,34 → 0,33
  assert.deepEqual(sim.schedule.map((i: any) => i.interest.value), ['100', '67', '33']);
  assert.equal(sim.highestInstallment.value, '3433');
  assert.deepEqual(sim.receiveAmount, eur('10000'));
  assert.equal(sim.schedule.reduce((a: bigint, i: any) => a + BigInt(i.capital.value), 0n), 10000n);
  await fails(simulateLoan(ev('luz', { params: { value: '10.5', assetCode: 'EUR', assetScale: '2', installments: '3' } })), 400, 'InvalidAmount');
  await fails(simulateLoan(ev('luz', { params: { value: '1000', assetCode: 'EUR', assetScale: '2', installments: '13' } })), 400, 'InvalidInstallments');
  await fails(simulateLoan({ params: {} }), 401, 'Unauthorized');
});

test('pedir → la tesorera la ve → rechaza; nadie más puede decidir', async () => {
  const req: any = await requestLoan(ev('luz', { body: { natilleraId: 'n1', value: '2000', assetCode: 'EUR', assetScale: 2, installments: 4 } }));
  assert.equal(req.status, 'pending');
  assert.equal(req.requesterName, 'luz');
  assert.equal(req.repaymentAuthorized, false);

  assert.deepEqual(await listLoanRequests(ev('luz')), []); // luz no es ADMIN
  const pending: any = await listLoanRequests(ev('rosa'));
  assert.deepEqual(pending.map((r: any) => r.requestId), [req.requestId]);

  const mine: any = await getMyLoans(ev('luz'));
  assert.equal(mine.request.requestId, req.requestId);
  assert.equal(mine.loan, null);

  // Solo la ADMIN decide; a los demás se les responde 404 (no se revela la solicitud).
  await fails(decideLoan(ev('andres', { params: { requestId: req.requestId }, body: { accepted: false } })), 404, 'LoanRequestNotFound');
  // Aprobar exige que quien pide haya autorizado las cuotas (fase 2).
  await fails(decideLoan(ev('rosa', { params: { requestId: req.requestId }, body: { accepted: true } })), 409, 'RepaymentNotAuthorized');

  assert.deepEqual(await decideLoan(ev('rosa', { params: { requestId: req.requestId }, body: { accepted: false } })), { status: 'rejected' });
  await fails(decideLoan(ev('rosa', { params: { requestId: req.requestId }, body: { accepted: false } })), 409, 'AlreadyDecided');
  assert.deepEqual(await listLoanRequests(ev('rosa')), []);
  assert.equal(((await getMyLoans(ev('luz'))) as any).request.status, 'rejected');
});

test('reglas al pedir: socio, moneda del fondo, fondo suficiente, uno a la vez', async () => {
  const body = (extra: Row) => ({ body: { natilleraId: 'n1', value: '2000', assetCode: 'EUR', assetScale: 2, installments: 2, ...extra } });
  await fails(requestLoan(ev('extraño', body({}))), 403, 'Forbidden');
  await fails(requestLoan(ev('luz', body({ natilleraId: 'nada' }))), 404, 'NatilleraNotFound');
  await fails(requestLoan(ev('luz', body({ assetCode: 'COP' }))), 400, 'InvalidAmount');
  await fails(requestLoan(ev('luz', body({ value: '5601' }))), 409, 'InsufficientFunds');
  await requestLoan(ev('luz', body({ value: '5600' })));
  await fails(requestLoan(ev('luz', body({}))), 409, 'LoanAlreadyActive');
  // Otro socio sí puede pedir.
  await requestLoan(ev('andres', body({})));
});

test('mi préstamo desembolsado (campos que escribe la fase 2): plan con pagadas y saldo', async () => {
  rows(env.loansTable).push({
    requestId: 'r1', natilleraId: 'n1', author: 'andres', amount: eur('3000'), installments: 3, status: 'approved',
    repaymentAuthorized: true, createdAt: '2026-10-17T10:00:00Z', disbursed: true, receivedAmount: { value: '1300000', assetCode: 'COP', assetScale: 2 }, paidCount: 1,
  });
  const mine: any = await getMyLoans(ev('andres'));
  assert.equal(mine.loan.disbursed, true);
  assert.deepEqual(mine.loan.schedule.map((i: any) => i.status), ['pagada', 'pendiente', 'pendiente']);
  assert.equal(mine.loan.balance.value, '2000');
  assert.equal(mine.loan.receivedAmount.assetCode, 'COP');
  // Con cuotas por pagar, sigue activo: no puede pedir otro.
  await fails(requestLoan(ev('andres', { body: { natilleraId: 'n1', value: '100', assetCode: 'EUR', assetScale: 2, installments: 1 } })), 409, 'LoanAlreadyActive');
});

test('aprobar con cuotas autorizadas: el desembolso pide returnUrl (el resto, en fase2.test.ts)', async () => {
  rows(env.loansTable).push({ requestId: 'r2', natilleraId: 'n1', author: 'luz', amount: eur('1000'), installments: 2, status: 'pending', repaymentAuthorized: true, createdAt: '2026-10-17T10:00:00Z' });
  await fails(decideLoan(ev('rosa', { params: { requestId: 'r2' }, body: { accepted: true } })), 400, 'InvalidReturnUrl');
  await fails(decideLoan(ev('rosa', { params: { requestId: 'r2' }, body: {} })), 400, 'BadRequest');
});

test('varias natilleras: pendientes de todas las que administra, un préstamo activo por natillera', async () => {
  // Luz administra n2 y es socia de n1 (de Rosa). Andrés está en las dos.
  rows(env.natillerasTable).push({ natilleraId: 'n2', author: 'luz', integrants: ['luz', 'andres'], assetCode: 'EUR', assetScale: 2, disbursedTotal: '0' });
  rows(env.recordsTable).push({ natilleraId: 'n2', id: 1, author: 'luz', amount: eur('5000') });
  const body = (natilleraId: string) => ({ body: { natilleraId, value: '1000', assetCode: 'EUR', assetScale: 2, installments: 2 } });

  const enN1: any = await requestLoan(ev('andres', body('n1')));
  // Ya tiene una pendiente en n1, pero en n2 puede pedir.
  await fails(requestLoan(ev('andres', body('n1'))), 409, 'LoanAlreadyActive');
  const enN2: any = await requestLoan(ev('andres', body('n2')));

  // Cada tesorera ve solo las de su natillera; con natilleraId se filtra.
  assert.deepEqual(((await listLoanRequests(ev('rosa'))) as any[]).map((r) => r.requestId), [enN1.requestId]);
  assert.deepEqual(((await listLoanRequests(ev('luz'))) as any[]).map((r) => r.requestId), [enN2.requestId]);
  assert.deepEqual(await listLoanRequests(ev('luz', { params: { natilleraId: 'n1' } })), []); // en n1 Luz no es ADMIN

  // Mi préstamo: el más reciente, o el de la natillera indicada.
  assert.equal(((await getMyLoans(ev('andres', { params: { natilleraId: 'n1' } }))) as any).request.requestId, enN1.requestId);
  assert.equal(((await getMyLoans(ev('andres', { params: { natilleraId: 'n2' } }))) as any).request.natilleraId, 'n2');

  // Luz no puede decidir la de n1 (no es ADMIN ahí) aunque administre otra natillera.
  await fails(decideLoan(ev('luz', { params: { requestId: enN1.requestId }, body: { accepted: false } })), 404, 'LoanRequestNotFound');
  assert.deepEqual(await decideLoan(ev('luz', { params: { requestId: enN2.requestId }, body: { accepted: false } })), { status: 'rejected' });
});
