// Lógica de préstamos, fase 1 (flujos 10, 11 y 13 de ARQUITECTURA.md sin Open Payments):
// simular, pedir, listar las pendientes (ADMIN), ver el mío y rechazar.
//
// Fase 2 (pendiente, con Open Payments, en coordinación con Duvan):
//  - Autorizar el cobro de las cuotas (flujo 12B): grant recurrente → `repaymentAuthorized = true`.
//  - Desembolso al aprobar (flujo 11): pago del fondo a quien pidió → `disbursed = true`,
//    `receivedAmount`, `disbursedAt`, y `disbursedTotal` de la natillera aumenta (lo resta el fondo).
//  - Cobro de cada cuota → `paidCount` aumenta.
// Esta fase ya lee esos campos (vista de `GET /loans/mine`), así que la fase 2 solo tiene que escribirlos.
import { randomUUID } from 'node:crypto';
import { GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo, env, HttpError, type Amount } from './shared';

// ---------------------------------------------------------------- Tipos

export type InstallmentStatus = 'pagada' | 'pendiente' | 'en-mora';
export type Installment = { n: number; capital: Amount; interest: Amount; total: Amount; status: InstallmentStatus };
export type LoanStatus = 'pending' | 'approved' | 'rejected';

// Fila de `natillera-loan-request` (PK requestId; GSI author-index y natillera-index por createdAt).
type LoanItem = {
  requestId: string;
  natilleraId: string;
  author: string;
  amount: Amount;
  installments: number;
  status: LoanStatus;
  repaymentAuthorized: boolean;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  // Fase 2:
  disbursed?: boolean;
  receivedAmount?: Amount;
  paidCount?: number;
};

type NatilleraItem = {
  natilleraId: string;
  author: string; // ADMIN
  integrants: string[];
  assetCode: string;
  assetScale: number;
  disbursedTotal?: string;
};

// ---------------------------------------------------------------- Validación

const parseValue = (raw: unknown): bigint => {
  if (typeof raw !== 'string' || !/^[1-9]\d{0,15}$/.test(raw)) {
    throw new HttpError(400, 'InvalidAmount', 'value must be a positive integer string in minor units');
  }
  return BigInt(raw);
};

const parseInstallments = (raw: unknown): number => {
  const n = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > env.maxInstallments) {
    throw new HttpError(400, 'InvalidInstallments', `installments must be an integer between 1 and ${env.maxInstallments}`);
  }
  return n;
};

const parseAsset = (assetCode: unknown, assetScale: unknown) => {
  const scale = typeof assetScale === 'string' ? Number(assetScale) : assetScale;
  if (typeof assetCode !== 'string' || !/^[A-Z]{3}$/.test(assetCode) || typeof scale !== 'number' || !Number.isInteger(scale) || scale < 0 || scale > 9) {
    throw new HttpError(400, 'InvalidAmount', 'assetCode (3 letters) and assetScale (0-9) are required');
  }
  return { assetCode, assetScale: scale };
};

// ---------------------------------------------------------------- Plan de pagos

// Cuotas de capital iguales (la última absorbe el residuo para que sumen exacto) e interés sobre el
// saldo de cada periodo, redondeado al entero más cercano. Todo en BigInt: nunca floats con dinero.
export const buildSchedule = (value: bigint, installments: number, asset: { assetCode: string; assetScale: number }, paidCount = 0) => {
  const money = (v: bigint): Amount => ({ value: v.toString(), ...asset });
  const n = BigInt(installments);
  const base = value / n;
  const schedule: Installment[] = [];
  let balance = value;
  for (let i = 0; i < installments; i++) {
    const capital = i === installments - 1 ? balance : base;
    const interest = (balance * env.rateBps + 5000n) / 10000n;
    schedule.push({
      n: i + 1,
      capital: money(capital),
      interest: money(interest),
      total: money(capital + interest),
      status: i < paidCount ? 'pagada' : 'pendiente',
    });
    balance -= capital;
  }
  return schedule;
};

const highest = (schedule: Installment[]) =>
  schedule.reduce((max, i) => (BigInt(i.total.value) > BigInt(max.total.value) ? i : max), schedule[0]).total;

// GET /loans/simulate (flujo 10). `receiveAmount` es el mismo monto: la conversión a la moneda de quien
// pide sale de la quote del desembolso (fase 2); la app la muestra en la 28 antes de aprobar.
export const simulateLoan = (query: Record<string, unknown>) => {
  const value = parseValue(query.value);
  const installments = parseInstallments(query.installments);
  const asset = parseAsset(query.assetCode, query.assetScale);
  const amount: Amount = { value: value.toString(), ...asset };
  const schedule = buildSchedule(value, installments, asset);
  return { amount, installments, receiveAmount: amount, highestInstallment: highest(schedule), schedule };
};

// ---------------------------------------------------------------- Natillera (solo lectura)

const getNatillera = async (natilleraId: string) => {
  const { Item } = await dynamo.send(new GetCommand({ TableName: env.natillerasTable, Key: { natilleraId } }));
  return (Item as NatilleraItem | undefined) ?? null;
};

// Mismo criterio que el bloque A: una persona = una natillera; Scan con filtro (pocas filas en la demo).
const findNatilleraOf = async (username: string) => {
  let ExclusiveStartKey: Record<string, any> | undefined;
  do {
    const page = await dynamo.send(
      new ScanCommand({
        TableName: env.natillerasTable,
        FilterExpression: 'contains(integrants, :u)',
        ExpressionAttributeValues: { ':u': username },
        ExclusiveStartKey,
      }),
    );
    if (page.Items?.[0]) return page.Items[0] as NatilleraItem;
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return null;
};

// Plata disponible en el fondo = aportes (natillera-records, moneda del fondo) − desembolsado.
const availableFund = async (n: NatilleraItem) => {
  let total = 0n;
  let ExclusiveStartKey: Record<string, any> | undefined;
  do {
    const page = await dynamo.send(
      new QueryCommand({
        TableName: env.recordsTable,
        KeyConditionExpression: 'natilleraId = :n',
        ExpressionAttributeValues: { ':n': n.natilleraId },
        ExclusiveStartKey,
      }),
    );
    for (const r of page.Items ?? []) {
      if (r.amount?.assetCode === n.assetCode && r.amount?.assetScale === n.assetScale) total += BigInt(r.amount.value);
    }
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return total - BigInt(n.disbursedTotal ?? '0');
};

// ---------------------------------------------------------------- Solicitudes

const toRequest = (i: LoanItem) => ({
  requestId: i.requestId,
  natilleraId: i.natilleraId,
  requesterName: i.author,
  amount: i.amount,
  installments: i.installments,
  repaymentAuthorized: Boolean(i.repaymentAuthorized),
  status: i.status,
  createdAt: i.createdAt,
});

const queryLoans = async (indexName: string, field: string, value: string) => {
  const items: LoanItem[] = [];
  let ExclusiveStartKey: Record<string, any> | undefined;
  do {
    const page = await dynamo.send(
      new QueryCommand({
        TableName: env.loansTable,
        IndexName: indexName,
        KeyConditionExpression: `${field} = :v`,
        ExpressionAttributeValues: { ':v': value },
        ExclusiveStartKey,
      }),
    );
    items.push(...((page.Items ?? []) as LoanItem[]));
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

// Un préstamo a la vez: pendiente, o aprobado con cuotas por pagar.
const isActive = (i: LoanItem) => i.status === 'pending' || (i.status === 'approved' && (i.paidCount ?? 0) < i.installments);

// POST /loans/requests (flujo 10) { natilleraId, value, assetCode, assetScale, installments } → LoanRequest.
export const requestLoan = async (username: string, body: Record<string, any>) => {
  if (typeof body.natilleraId !== 'string' || !body.natilleraId) throw new HttpError(400, 'BadRequest', 'natilleraId is required');
  const value = parseValue(body.value);
  const installments = parseInstallments(body.installments);
  const asset = parseAsset(body.assetCode, body.assetScale);

  const natillera = await getNatillera(body.natilleraId);
  if (!natillera) throw new HttpError(404, 'NatilleraNotFound', 'Natillera not found');
  if (!natillera.integrants.includes(username)) throw new HttpError(403, 'Forbidden', 'You are not a member of this natillera');
  // El préstamo sale del fondo: siempre en su moneda.
  if (asset.assetCode !== natillera.assetCode || asset.assetScale !== natillera.assetScale) {
    throw new HttpError(400, 'InvalidAmount', `Loans are in the fund currency (${natillera.assetCode}, scale ${natillera.assetScale})`);
  }
  if ((await queryLoans(env.authorIndex, 'author', username)).some(isActive)) {
    throw new HttpError(409, 'LoanAlreadyActive', 'You already have a loan request or an active loan');
  }
  if (value > (await availableFund(natillera))) throw new HttpError(409, 'InsufficientFunds', 'The fund does not have that much money');

  const item: LoanItem = {
    requestId: randomUUID(),
    natilleraId: natillera.natilleraId,
    author: username,
    amount: { value: value.toString(), ...asset },
    installments,
    status: 'pending',
    repaymentAuthorized: false,
    createdAt: new Date().toISOString(),
  };
  await dynamo.send(new PutCommand({ TableName: env.loansTable, Item: item, ConditionExpression: 'attribute_not_exists(requestId)' }));
  return toRequest(item);
};

// GET /loans/requests?status=pending (flujo 13, tesorera). Quien no es ADMIN recibe [].
export const listPendingRequests = async (username: string) => {
  const natillera = await findNatilleraOf(username);
  if (!natillera || natillera.author !== username) return [];
  return (await queryLoans(env.natilleraIndex, 'natilleraId', natillera.natilleraId)).filter((i) => i.status === 'pending').map(toRequest);
};

// GET /loans/mine (flujo 13) → { request, loan }: la solicitud más reciente y, si ya se desembolsó, el préstamo.
export const getMyLoans = async (username: string) => {
  const mine = await queryLoans(env.authorIndex, 'author', username);
  const latest = mine[mine.length - 1];
  if (!latest) return { request: null, loan: null };
  const request = toRequest(latest);
  if (latest.status !== 'approved' || !latest.disbursed) return { request, loan: null };

  const asset = { assetCode: latest.amount.assetCode, assetScale: latest.amount.assetScale };
  const schedule = buildSchedule(BigInt(latest.amount.value), latest.installments, asset, latest.paidCount ?? 0);
  const paidCapital = schedule.filter((i) => i.status === 'pagada').reduce((acc, i) => acc + BigInt(i.capital.value), 0n);
  return {
    request,
    loan: {
      loanId: `loan-${latest.requestId}`,
      request,
      disbursed: true,
      receivedAmount: latest.receivedAmount,
      balance: { value: (BigInt(latest.amount.value) - paidCapital).toString(), ...asset },
      schedule,
    },
  };
};

// POST /loans/requests/{requestId}/decision (flujo 11, ADMIN) { accepted } →
//   rechazo: { status: 'rejected' } · aprobación: requiere el desembolso de la fase 2.
export const decideLoan = async (username: string, requestId: string | undefined, body: Record<string, any>) => {
  if (!requestId) throw new HttpError(400, 'BadRequest', 'Missing requestId');
  if (typeof body.accepted !== 'boolean') throw new HttpError(400, 'BadRequest', 'accepted must be true or false');
  const { Item } = await dynamo.send(new GetCommand({ TableName: env.loansTable, Key: { requestId } }));
  const loan = Item as LoanItem | undefined;
  const natillera = loan ? await getNatillera(loan.natilleraId) : null;
  // Mismo 404 si no existe o si quien llama no es ADMIN de esa natillera: no se revelan solicitudes ajenas.
  if (!loan || !natillera || natillera.author !== username) throw new HttpError(404, 'LoanRequestNotFound', 'Loan request not found');
  if (loan.status !== 'pending') throw new HttpError(409, 'AlreadyDecided', `Loan request is already ${loan.status}`);

  if (!body.accepted) {
    try {
      await dynamo.send(
        new UpdateCommand({
          TableName: env.loansTable,
          Key: { requestId },
          UpdateExpression: 'SET #s = :rejected, decidedAt = :now, decidedBy = :admin',
          ConditionExpression: '#s = :pending',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':rejected': 'rejected', ':pending': 'pending', ':now': new Date().toISOString(), ':admin': username },
        }),
      );
    } catch (error: any) {
      if (error?.name === 'ConditionalCheckFailedException') throw new HttpError(409, 'AlreadyDecided', 'Loan request was already decided');
      throw error;
    }
    return { status: 'rejected' as const };
  }

  // La app solo deja aprobar si las cuotas están autorizadas (pantalla 21).
  if (!loan.repaymentAuthorized) throw new HttpError(409, 'RepaymentNotAuthorized', 'The borrower has not authorized the installments yet');
  throw new HttpError(501, 'DisbursementNotAvailable', 'Loan disbursement (Open Payments) is not deployed yet');
};
