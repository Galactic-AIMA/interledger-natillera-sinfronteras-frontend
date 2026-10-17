// Pruebas locales de la fase 2 (permiso de cobro, desembolso) y de la cuota automática, sin AWS ni red:
// DynamoDB en memoria, secretos en memoria y un cliente de Open Payments falso. npm test
process.env.INTEGRATION_MODE = 'vtl';

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { beforeEach, test } from 'node:test';
import { dynamo, env } from '../src/shared';
import { opEnv, setClientForTests } from '../src/op';
import { setGrantSecretsForTests } from '../src/grants';
import { handler as requestLoan } from '../src/request-loan';
import { handler as listLoanRequests } from '../src/list-loan-requests';
import { handler as getMyLoans } from '../src/get-my-loans';
import { handler as decideLoan } from '../src/decide-loan';
import { handler as startRepaymentGrant } from '../src/start-repayment-grant';
import { handler as finishRepaymentGrant } from '../src/finish-repayment-grant';
import { handler as startRecurring } from '../src/start-recurring';
import { handler as finishRecurring } from '../src/finish-recurring';
import { handler as chargeRecurringNow } from '../src/charge-recurring-now';

// Las variables de entorno se leen al importar: se fija aquí la base de return-payment (opción B).
opEnv.returnBaseUrl = 'https://api.test/dev';

// ---------------------------------------------------------------- DynamoDB en memoria

type Row = Record<string, any>;
let tables: Record<string, Row[]> = {};
const keysOf: Record<string, string[]> = {
  [env.natillerasTable]: ['natilleraId'],
  [env.recordsTable]: ['natilleraId', 'id'],
  [env.loansTable]: ['requestId'],
  [opEnv.usersTable]: ['source'],
  [opEnv.paymentsTable]: ['paymentId'],
  [opEnv.grantsTable]: ['grantId'],
};
const rows = (t: string) => (tables[t] ??= []);
const sameKey = (t: string, a: Row, b: Row) => keysOf[t].every((k) => a[k] === b[k]);
const cond = () => Object.assign(new Error('cond'), { name: 'ConditionalCheckFailedException' });

// Solo las formas que usa el código: `a = :v` unidas con AND, attribute_not_exists, SET y REMOVE.
const name = (i: any, n: string) => i.ExpressionAttributeNames?.[n] ?? n;
const holds = (i: any, row: Row | undefined, expr?: string) =>
  !expr ||
  expr.split(' AND ').every((part) => {
    const notExists = /^attribute_not_exists\((.+)\)$/.exec(part.trim());
    if (notExists) return row?.[name(i, notExists[1])] === undefined;
    const [field, value] = part.trim().split(' = ');
    return row !== undefined && row[name(i, field)] === i.ExpressionAttributeValues[value];
  });

(dynamo as any).send = async (cmd: any) => {
  const i = cmd.input;
  const t = i.TableName as string;
  switch (cmd.constructor.name) {
    case 'GetCommand':
      return { Item: structuredClone(rows(t).find((r) => sameKey(t, r, i.Key))) };
    case 'PutCommand': {
      const old = rows(t).find((r) => sameKey(t, r, i.Item));
      if (old && i.ConditionExpression?.includes('attribute_not_exists')) throw cond();
      if (old) rows(t).splice(rows(t).indexOf(old), 1);
      rows(t).push(structuredClone(i.Item));
      return {};
    }
    case 'QueryCommand': {
      const [field, value] = (i.KeyConditionExpression as string).split(' = ');
      return { Items: rows(t).filter((r) => r[name(i, field)] === i.ExpressionAttributeValues[value]).map((r) => structuredClone(r)) };
    }
    case 'ScanCommand': {
      const u = i.ExpressionAttributeValues[':u'];
      return { Items: rows(t).filter((r) => r.integrants?.includes(u)).map((r) => structuredClone(r)) };
    }
    case 'UpdateCommand': {
      const row = rows(t).find((r) => sameKey(t, r, i.Key));
      if (!holds(i, row, i.ConditionExpression)) throw cond();
      if (!row) throw new Error('fake dynamo: update sin fila');
      const [setPart, removePart] = ` ${i.UpdateExpression}`.split(' REMOVE ');
      for (const assign of setPart.trim() ? setPart.trim().replace(/^SET /, '').split(', ') : []) {
        const [field, value] = assign.split(' = ');
        row[name(i, field)] = structuredClone(i.ExpressionAttributeValues[value]);
      }
      for (const field of removePart?.split(', ') ?? []) delete row[name(i, field.trim())];
      return {};
    }
  }
  throw new Error(`fake dynamo: ${cmd.constructor.name} no implementado`);
};

// ---------------------------------------------------------------- Secretos y Open Payments falsos

let secrets: Record<string, any> = {};
setGrantSecretsForTests({
  async create(id, data) {
    if (secrets[id]) throw new Error('ya existe');
    secrets[id] = structuredClone(data);
  },
  async put(id, data) {
    secrets[id] = structuredClone(data);
  },
  async get(id) {
    return structuredClone(secrets[id]);
  },
});

const W = 'https://ilp.interledger-test.dev';
const ASSETS: Record<string, string> = { [`${W}/fondo`]: 'EUR', [`${W}/luz`]: 'COP', [`${W}/rosa`]: 'EUR', [`${W}/andres`]: 'USD' };
const AUTH = 'https://auth.interledger-test.dev';
let seq = 0;
let expiredToken = '';
const calls: { outgoing: any[]; grants: any[] } = { outgoing: [], grants: [] };
const money = (value: string, assetCode: string) => ({ value, assetCode, assetScale: 2 });

setClientForTests({
  walletAddress: {
    get: async ({ url }: any) => ({ id: url, authServer: AUTH, resourceServer: `${url}/rs`, assetCode: ASSETS[url], assetScale: 2, publicName: url }),
  },
  grant: {
    request: async (_: any, body: any) => {
      calls.grants.push(body);
      if (!body.interact) return { access_token: { value: `tok-${++seq}` }, continue: {} };
      return {
        interact: { redirect: `https://wallet.test/approve/${++seq}`, finish: `srv-nonce-${seq}` },
        continue: { uri: `${AUTH}/continue/${seq}`, access_token: { value: `cont-${seq}` }, wait: 5 },
      };
    },
    continue: async (_: any, body: any) => {
      if (body.interact_ref === 'rechazado') throw Object.assign(new Error('rejected'), { name: 'OpenPaymentsClientError', status: 401 });
      return { access_token: { value: `access-${++seq}`, manage: `${AUTH}/token/${seq}` }, continue: { uri: '', access_token: { value: '' } } };
    },
  },
  incomingPayment: { create: async () => ({ id: `${W}/ip/${++seq}` }) },
  // Tasa falsa: 1 EUR = 4500 COP = 1,10 USD (en unidades menores, escala 2 en todas).
  quote: {
    create: async (args: any, body: any) => {
      const from = ASSETS[body.walletAddress];
      const rate: Record<string, number> = { EUR: 1, COP: 4500, USD: 1.1 };
      const debit = body.debitAmount?.value ?? '1000';
      return {
        id: `${W}/quote/${++seq}`,
        debitAmount: money(body.debitAmount ? debit : String(Math.round(1000 * rate[from])), from),
        receiveAmount: money(body.debitAmount ? String(Math.round((Number(debit) * 4500))) : '1000', body.debitAmount ? 'COP' : 'EUR'),
      };
    },
  },
  outgoingPayment: {
    create: async (args: any, body: any) => {
      if (args.accessToken === expiredToken) throw Object.assign(new Error('expired'), { name: 'OpenPaymentsClientError', status: 401 });
      calls.outgoing.push({ ...args, ...body });
      return { id: `${W}/op/${++seq}`, failed: false };
    },
  },
  token: { rotate: async () => ({ access_token: { value: `rotated-${++seq}`, manage: `${AUTH}/token/${seq}` } }) },
});

// ---------------------------------------------------------------- Ayudas

const ev = (username: string, extra: Row = {}) => ({ auth: { username, sub: `sub-${username}` }, ...extra });
const fails = async (p: Promise<unknown>, status: number, error: string) =>
  assert.rejects(p, (e: Error) => e.message.startsWith(`[${status}]`) && e.message.includes(`"${error}"`));
const RETURN = 'natillera://retorno';
// Hash que pondría la billetera: SHA-256(clientNonce \n finishNonce \n interact_ref \n authServer), base64.
const hashFor = (grantId: string, ref: string) => {
  const g = rows(opEnv.grantsTable).find((r) => r.grantId === grantId)!;
  return createHash('sha256').update(`${g.clientNonce}\n${g.interactFinishNonce}\n${ref}\n${g.authServer}`).digest('base64');
};

beforeEach(() => {
  tables = {};
  secrets = {};
  seq = 0;
  expiredToken = '';
  calls.outgoing = [];
  calls.grants = [];
  rows(env.natillerasTable).push({
    natilleraId: 'n1', natilleraName: 'Natillera Gómez', walletAddress: `${W}/fondo`, author: 'rosa',
    integrants: ['rosa', 'luz', 'andres'], assetCode: 'EUR', assetScale: 2, disbursedTotal: '1000',
  });
  rows(env.recordsTable).push({ natilleraId: 'n1', id: 1, author: 'rosa', amount: money('6600', 'EUR') });
  for (const u of ['rosa', 'luz', 'andres']) rows(opEnv.usersTable).push({ source: u, id: 1, walletAddress: `${W}/${u}` });
});

// ---------------------------------------------------------------- Préstamo de punta a punta

test('préstamo: permiso de cobro → la tesorera aprueba → desembolso → préstamo activo', async () => {
  const req: any = await requestLoan(ev('luz', { body: { natilleraId: 'n1', value: '2000', assetCode: 'EUR', assetScale: 2, installments: 2 } }));

  // 12B: solo quien pidió, con returnUrl permitido.
  await fails(startRepaymentGrant(ev('andres', { params: { requestId: req.requestId }, body: { returnUrl: RETURN } })), 404, 'LoanRequestNotFound');
  await fails(startRepaymentGrant(ev('luz', { params: { requestId: req.requestId }, body: { returnUrl: 'https://otro.sitio' } })), 400, 'InvalidReturnUrl');
  const grant: any = await startRepaymentGrant(ev('luz', { params: { requestId: req.requestId }, body: { returnUrl: RETURN } }));
  assert.equal(grant.status, 'pending');
  assert.equal(grant.repetitions, 2);
  assert.match(grant.redirectUrl, /^https:\/\/wallet\.test\/approve\//);
  // Tope en la moneda de Luz (COP), con el 5 % de margen sobre la quote.
  assert.deepEqual(grant.limitPerCharge, money('4725000', 'COP'));
  const interactive = calls.grants.find((g) => g.interact);
  assert.equal(interactive.interact.finish.uri, `${RETURN}?grantId=${grant.grantId}`);
  assert.match(interactive.access_token.access[0].limits.interval, /^R2\/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\/P1M$/);
  // Nada de tokens en DynamoDB: el de continuación está en el secreto.
  assert.equal(JSON.stringify(rows(opEnv.grantsTable)).includes('cont-'), false);
  assert.ok(secrets[grant.grantId].continueToken);

  // Sin las cuotas autorizadas no se puede aprobar.
  await fails(decideLoan(ev('rosa', { params: { requestId: req.requestId }, body: { accepted: true, returnUrl: RETURN } })), 409, 'RepaymentNotAuthorized');

  // Vuelve de la billetera: hash malo → 400; bueno → activo y la solicitud queda autorizada.
  await fails(finishRepaymentGrant(ev('luz', { params: { grantId: grant.grantId }, body: { interact_ref: 'ref-1', hash: 'malo' } })), 400, 'InvalidHash');
  const done: any = await finishRepaymentGrant(ev('luz', { params: { grantId: grant.grantId }, body: { interact_ref: 'ref-1', hash: hashFor(grant.grantId, 'ref-1') } }));
  assert.equal(done.status, 'active');
  assert.ok(secrets[grant.grantId].accessToken);
  assert.equal(((await getMyLoans(ev('luz'))) as any).request.repaymentAuthorized, true);
  // Repetir el finish es idempotente.
  assert.equal(((await finishRepaymentGrant(ev('luz', { params: { grantId: grant.grantId }, body: { interact_ref: 'ref-1' } }))) as any).status, 'active');

  // La tesorera aprueba: desembolso del fondo (sale exacto 20,00 €) a la billetera de Luz.
  const approved: any = await decideLoan(ev('rosa', { params: { requestId: req.requestId }, body: { accepted: true, returnUrl: RETURN } }));
  assert.equal(approved.status, 'approved');
  assert.deepEqual(approved.debitAmount, money('2000', 'EUR'));
  assert.equal(approved.receiveAmount.assetCode, 'COP');
  const payment = rows(opEnv.paymentsTable).find((p) => p.paymentId === approved.paymentId)!;
  assert.equal(payment.author, 'rosa'); // la sigue la tesorera con GET /payments/{id}
  assert.equal(payment.senderWalletAddress, `${W}/fondo`);
  assert.equal(payment.receiverWalletAddress, `${W}/luz`);
  assert.equal(calls.grants.at(-1).interact.finish.uri, `https://api.test/dev/payments/${approved.paymentId}/return`);
  // Mientras la billetera del fondo no apruebe: sigue pendiente y no se puede iniciar otro.
  await fails(decideLoan(ev('rosa', { params: { requestId: req.requestId }, body: { accepted: true, returnUrl: RETURN } })), 409, 'DisbursementInProgress');
  assert.equal(((await listLoanRequests(ev('rosa'))) as any[]).length, 1);

  // return-payment (de David) lo completa → al leer, el préstamo queda aprobado y desembolsado.
  payment.status = 'completed';
  const mine: any = await getMyLoans(ev('luz'));
  assert.equal(mine.request.status, 'approved');
  assert.equal(mine.loan.disbursed, true);
  assert.equal(mine.loan.receivedAmount.assetCode, 'COP');
  assert.equal(mine.loan.schedule.length, 2);
  assert.deepEqual(await listLoanRequests(ev('rosa')), []);
  // El fondo ya lo descuenta (10,00 € de antes + 20,00 €), una sola vez aunque se lea otra vez.
  await getMyLoans(ev('luz'));
  assert.equal(rows(env.natillerasTable)[0].disbursedTotal, '3000');
});

test('desembolso rechazado en la billetera del fondo: la tesorera puede intentarlo otra vez', async () => {
  rows(env.loansTable).push({
    requestId: 'r1', natilleraId: 'n1', author: 'luz', amount: money('1000', 'EUR'), installments: 1, status: 'pending',
    repaymentAuthorized: true, createdAt: '2026-10-17T10:00:00Z',
  });
  const first: any = await decideLoan(ev('rosa', { params: { requestId: 'r1' }, body: { accepted: true, returnUrl: RETURN } }));
  rows(opEnv.paymentsTable).find((p) => p.paymentId === first.paymentId)!.status = 'rejected';
  const again: any = await decideLoan(ev('rosa', { params: { requestId: 'r1' }, body: { accepted: true, returnUrl: RETURN } }));
  assert.notEqual(again.paymentId, first.paymentId);
  assert.equal(rows(env.natillerasTable)[0].disbursedTotal, '1000');
});

test('desembolso: no más de lo que hay en el fondo', async () => {
  rows(env.loansTable).push({
    requestId: 'r1', natilleraId: 'n1', author: 'luz', amount: money('5601', 'EUR'), installments: 1, status: 'pending',
    repaymentAuthorized: true, createdAt: '2026-10-17T10:00:00Z',
  });
  await fails(decideLoan(ev('rosa', { params: { requestId: 'r1' }, body: { accepted: true, returnUrl: RETURN } })), 409, 'InsufficientFunds');
});

// ---------------------------------------------------------------- Cuota automática

test('cuota automática: permiso → cobro → aporte registrado', async () => {
  const body = { natilleraId: 'n1', value: '1000', assetCode: 'EUR', assetScale: 2, returnUrl: RETURN };
  await fails(startRecurring(ev('extraño', { body })), 403, 'Forbidden');
  await fails(startRecurring(ev('andres', { body: { ...body, assetCode: 'USD' } })), 400, 'InvalidAmount');
  await fails(startRecurring(ev('andres', { body: { ...body, author: 'extraño' } })), 400, 'BadRequest');

  // Andrés paga en dólares la cuota de Rosa (a nombre de otro integrante).
  const grant: any = await startRecurring(ev('andres', { body: { ...body, author: 'rosa' } }));
  assert.equal(grant.status, 'pending');
  assert.deepEqual(grant.limitPerCharge, money('1155', 'USD')); // 11,00 USD + 5 %
  await fails(chargeRecurringNow(ev('andres', { params: { grantId: grant.grantId } })), 409, 'GrantNotActive');

  await finishRecurring(ev('andres', { params: { grantId: grant.grantId }, body: { interact_ref: 'ref-2', hash: hashFor(grant.grantId, 'ref-2') } }));
  await fails(chargeRecurringNow(ev('luz', { params: { grantId: grant.grantId } })), 404, 'GrantNotFound');

  const paid: any = await chargeRecurringNow(ev('andres', { params: { grantId: grant.grantId } }));
  assert.equal(paid.status, 'completed');
  assert.equal(paid.kind, 'aporte');
  assert.equal(paid.counterpartName, 'Natillera Gómez');
  assert.deepEqual(paid.receiveAmount, money('1000', 'EUR'));
  assert.equal(calls.outgoing[0].walletAddress, `${W}/andres`);
  // Queda en el historial de Andrés y como aporte de Rosa en la natillera.
  assert.equal(rows(opEnv.paymentsTable).find((p) => p.paymentId === paid.paymentId)!.author, 'andres');
  const record = rows(env.recordsTable).find((r) => r.payments?.includes(paid.paymentId))!;
  assert.equal(record.author, 'rosa');
  assert.equal(record.paymentAuthor, 'andres');
  assert.equal(rows(opEnv.grantsTable)[0].chargedCount, 1);
});

test('cuota automática: rechazo en la billetera y token vencido', async () => {
  const body = { natilleraId: 'n1', value: '1000', assetCode: 'EUR', assetScale: 2, returnUrl: RETURN };
  const rejected: any = await startRecurring(ev('luz', { body }));
  assert.equal(((await finishRecurring(ev('luz', { params: { grantId: rejected.grantId }, body: { result: 'grant_rejected' } }))) as any).status, 'rejected');
  // Si la billetera no continúa el grant, también queda rechazado.
  const other: any = await startRecurring(ev('luz', { body }));
  const r: any = await finishRecurring(ev('luz', { params: { grantId: other.grantId }, body: { interact_ref: 'rechazado', hash: hashFor(other.grantId, 'rechazado') } }));
  assert.equal(r.status, 'rejected');

  const ok: any = await startRecurring(ev('luz', { body }));
  await finishRecurring(ev('luz', { params: { grantId: ok.grantId }, body: { interact_ref: 'ref-3', hash: hashFor(ok.grantId, 'ref-3') } }));
  // El access token venció: se rota con la URL de manejo, se guarda el nuevo y se cobra.
  expiredToken = secrets[ok.grantId].accessToken;
  const paid: any = await chargeRecurringNow(ev('luz', { params: { grantId: ok.grantId } }));
  assert.equal(paid.status, 'completed');
  assert.match(secrets[ok.grantId].accessToken, /^rotated-/);
});
