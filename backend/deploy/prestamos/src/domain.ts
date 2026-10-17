// Lógica de préstamos (flujos 10, 11, 12B y 13 de ARQUITECTURA.md).
// Fase 1, sin Open Payments: simular, pedir, listar las pendientes (ADMIN), ver el mío y rechazar.
// Fase 2, con Open Payments (grants.ts y op.ts):
//  - Autorizar el cobro de las cuotas (flujo 12B): grant recurrente → `repaymentAuthorized = true`.
//  - Desembolso al aprobar (flujo 11): pago del fondo a quien pidió, por el mismo camino de pagos de David
//    (fila en `natillera-payments` + return-payment / finish-payment). Al quedar `completed`,
//    `settleDisbursement` escribe `approved`, `disbursed`, `receivedAmount` y suma `disbursedTotal`.
//  - Cobro programado de cada cuota (`paidCount`): pendiente, la app no lo pide para la demo.
import { randomUUID } from 'node:crypto';
import { GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { isPendingGrant } from '@interledger/open-payments';
import { dynamo, env, HttpError, type Amount } from './shared';
import { finishGrant, publicGrant, startGrant } from './grants';
import { checkWalletUrl, getClient, opEnv, quotePayment, userWalletUrl, validateReturnUrl } from './op';

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
  repaymentGrantId?: string;
  disbursementPaymentId?: string;
  disbursed?: boolean;
  disbursedAt?: string;
  receivedAmount?: Amount;
  paidCount?: number;
};

export type NatilleraItem = {
  natilleraId: string;
  natilleraName?: string;
  walletAddress: string;
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

// Monto en la moneda del fondo (préstamos y cuotas de la natillera).
export const parseFundAmount = (body: Record<string, any>, natillera: NatilleraItem): Amount => {
  const value = parseValue(body.value);
  const asset = parseAsset(body.assetCode, body.assetScale);
  if (asset.assetCode !== natillera.assetCode || asset.assetScale !== natillera.assetScale) {
    throw new HttpError(400, 'InvalidAmount', `Amount must be in the fund currency (${natillera.assetCode}, scale ${natillera.assetScale})`);
  }
  return { value: value.toString(), ...asset };
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

export const getNatillera = async (natilleraId: string) => {
  const { Item } = await dynamo.send(new GetCommand({ TableName: env.natillerasTable, Key: { natilleraId } }));
  return (Item as NatilleraItem | undefined) ?? null;
};

// Una persona puede estar en varias natilleras (mismo criterio que el bloque A con varias natilleras).
// Scan con filtro: pocas filas en la demo.
const findNatillerasOf = async (username: string) => {
  const items: NatilleraItem[] = [];
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
    items.push(...((page.Items ?? []) as NatilleraItem[]));
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
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

// Un préstamo a la vez por natillera: pendiente, o aprobado con cuotas por pagar.
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
  const mine = await queryLoans(env.authorIndex, 'author', username);
  if (mine.some((i) => i.natilleraId === natillera.natilleraId && isActive(i))) {
    throw new HttpError(409, 'LoanAlreadyActive', 'You already have a loan request or an active loan in this natillera');
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

// GET /loans/requests?status=pending[&natilleraId=] (flujo 13, tesorera): pendientes de las natilleras
// donde quien llama es ADMIN (o solo de la indicada). Quien no es ADMIN recibe [].
export const listPendingRequests = async (username: string, natilleraId?: string) => {
  const admined = (await findNatillerasOf(username)).filter((n) => n.author === username && (!natilleraId || n.natilleraId === natilleraId));
  const lists = await Promise.all(admined.map((n) => queryLoans(env.natilleraIndex, 'natilleraId', n.natilleraId)));
  const settled = await Promise.all(lists.flat().map(settleDisbursement));
  return settled
    .filter((i) => i.status === 'pending')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(toRequest);
};

// GET /loans/mine[?natilleraId=] (flujo 13) → { request, loan }: la solicitud más reciente (de esa natillera,
// si se indica) y, si ya se desembolsó, el préstamo.
export const getMyLoans = async (username: string, natilleraId?: string) => {
  const mine = (await queryLoans(env.authorIndex, 'author', username)).filter((i) => !natilleraId || i.natilleraId === natilleraId);
  const last = mine[mine.length - 1];
  if (!last) return { request: null, loan: null };
  const latest = await settleDisbursement(last);
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
  const loan = Item ? await settleDisbursement(Item as LoanItem) : undefined;
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
  return startDisbursement(username, loan, natillera, body);
};

// ---------------------------------------------------------------- Fase 2: permiso de cobro (12B)

// POST /loans/requests/{requestId}/repayment-grant { returnUrl } → RecurringGrant. Quien pidió aprueba en su
// billetera que el fondo le cobre una cuota al mes (tope: la cuota más alta, con margen por la tasa).
export const startRepaymentGrant = async (username: string, requestId: string | undefined, body: Record<string, any>) => {
  if (!requestId) throw new HttpError(400, 'BadRequest', 'Missing requestId');
  const returnUrl = validateReturnUrl(body.returnUrl);
  const { Item } = await dynamo.send(new GetCommand({ TableName: env.loansTable, Key: { requestId } }));
  const loan = Item as LoanItem | undefined;
  if (!loan || loan.author !== username) throw new HttpError(404, 'LoanRequestNotFound', 'Loan request not found');
  if (loan.status !== 'pending') throw new HttpError(409, 'AlreadyDecided', `Loan request is already ${loan.status}`);
  if (loan.repaymentAuthorized) throw new HttpError(409, 'AlreadyAuthorized', 'The installments are already authorized');
  const natillera = await getNatillera(loan.natilleraId);
  if (!natillera) throw new HttpError(404, 'NatilleraNotFound', 'Natillera not found');

  const asset = { assetCode: loan.amount.assetCode, assetScale: loan.amount.assetScale };
  const { item, redirectUrl } = await startGrant({
    username,
    kind: 'loan-repayment',
    natilleraId: natillera.natilleraId,
    requestId,
    amount: highest(buildSchedule(BigInt(loan.amount.value), loan.installments, asset)),
    repetitions: loan.installments,
    receiverUrl: checkWalletUrl(natillera.walletAddress),
    receiverName: natillera.natilleraName ?? 'Natillera',
    returnUrl,
  });
  return publicGrant(item, redirectUrl);
};

// POST /loans/repayment/{grantId}/finish { interact_ref, hash, result } → RecurringGrant. Con el grant activo,
// la solicitud queda con las cuotas autorizadas y la tesorera ya puede aprobar.
export const finishRepaymentGrant = async (username: string, grantId: string | undefined, body: Record<string, any>) => {
  const grant = await finishGrant(username, grantId, 'loan-repayment', body);
  if (grant.status === 'active' && grant.requestId) {
    await dynamo.send(
      new UpdateCommand({
        TableName: env.loansTable,
        Key: { requestId: grant.requestId },
        UpdateExpression: 'SET repaymentAuthorized = :yes, repaymentGrantId = :g',
        ConditionExpression: 'author = :u',
        ExpressionAttributeValues: { ':yes': true, ':g': grant.grantId, ':u': username },
      }),
    );
  }
  return publicGrant(grant);
};

// ---------------------------------------------------------------- Fase 2: desembolso (flujo 11)

// Pago del fondo a quien pidió: sale el monto exacto del préstamo (moneda del fondo) y llega lo que dé la
// quote en la moneda de quien pidió. La tesorera lo aprueba en la billetera del fondo. Se guarda en
// `natillera-payments` con la forma de PaymentRecord, así lo completan return-payment / finish-payment
// (de David, sin cambios) y la app lo sigue con GET /payments/{id}.
const startDisbursement = async (admin: string, loan: LoanItem, natillera: NatilleraItem, body: Record<string, any>) => {
  const returnUrl = validateReturnUrl(body.returnUrl);
  if (loan.disbursementPaymentId) throw new HttpError(409, 'DisbursementInProgress', 'There is a disbursement waiting for the wallet');
  if (BigInt(loan.amount.value) > (await availableFund(natillera))) throw new HttpError(409, 'InsufficientFunds', 'The fund does not have that much money');

  const q = await quotePayment(checkWalletUrl(natillera.walletAddress), await userWalletUrl(loan.author), { debit: loan.amount });
  const paymentId = randomUUID();
  const clientNonce = randomUUID();
  const client = await getClient();
  const grant = await client.grant.request(
    { url: q.sender.authServer },
    {
      access_token: {
        access: [{ type: 'outgoing-payment', actions: ['read', 'create'], identifier: q.sender.id, limits: { debitAmount: q.debitAmount } }],
      },
      interact: {
        start: ['redirect'],
        finish: {
          method: 'redirect',
          uri: opEnv.returnBaseUrl ? `${opEnv.returnBaseUrl}/payments/${paymentId}/return` : `${returnUrl}?paymentId=${paymentId}`,
          nonce: clientNonce,
        },
      },
    },
  );
  if (!isPendingGrant(grant) || !grant.interact?.redirect) throw new HttpError(502, 'OpenPaymentsError', 'Expected an interactive grant');

  // Un desembolso a la vez por solicitud.
  try {
    await dynamo.send(
      new UpdateCommand({
        TableName: env.loansTable,
        Key: { requestId: loan.requestId },
        UpdateExpression: 'SET disbursementPaymentId = :p',
        ConditionExpression: '#s = :pending AND attribute_not_exists(disbursementPaymentId)',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':p': paymentId, ':pending': 'pending' },
      }),
    );
  } catch (error: any) {
    if (error?.name === 'ConditionalCheckFailedException') throw new HttpError(409, 'DisbursementInProgress', 'There is a disbursement waiting for the wallet');
    throw error;
  }

  const now = new Date().toISOString();
  await dynamo.send(
    new PutCommand({
      TableName: opEnv.paymentsTable,
      Item: {
        paymentId,
        author: admin,
        kind: 'p2p',
        status: 'pending',
        counterpartName: loan.author,
        natilleraId: natillera.natilleraId,
        loanRequestId: loan.requestId,
        senderWalletAddress: q.sender.id,
        receiverWalletAddress: q.receiver.id,
        incomingPaymentId: q.incomingPaymentId,
        quoteId: q.quoteId,
        debitAmount: q.debitAmount,
        receiveAmount: q.receiveAmount,
        authServer: q.sender.authServer,
        clientNonce,
        interactFinishNonce: grant.interact.finish,
        continueUri: grant.continue.uri,
        continueToken: grant.continue.access_token.value,
        appReturnUrl: returnUrl,
        createdAt: now,
        updatedAt: now,
      },
    }),
  );
  return { status: 'approved' as const, paymentId, redirectUrl: grant.interact.redirect, debitAmount: q.debitAmount, receiveAmount: q.receiveAmount };
};

// Lleva al préstamo lo que pasó con su desembolso. Se llama al leer (mis préstamos, pendientes, decidir),
// así no hace falta tocar el código de pagos: completed → aprobado y desembolsado; rejected / failed →
// se libera para que la tesorera lo intente de nuevo; pending → sigue esperando.
export const settleDisbursement = async (loan: LoanItem): Promise<LoanItem> => {
  if (loan.status !== 'pending' || !loan.disbursementPaymentId) return loan;
  const { Item: payment } = await dynamo.send(new GetCommand({ TableName: opEnv.paymentsTable, Key: { paymentId: loan.disbursementPaymentId } }));
  const status = payment?.status as string | undefined;
  if (status === 'pending' || status === 'processing') return loan;

  const key = { requestId: loan.requestId };
  const same = { ':p': loan.disbursementPaymentId, ':pending': 'pending' };
  try {
    if (status === 'completed') {
      const now = new Date().toISOString();
      await dynamo.send(
        new UpdateCommand({
          TableName: env.loansTable,
          Key: key,
          UpdateExpression: 'SET #s = :approved, disbursed = :yes, receivedAmount = :r, disbursedAt = :now, decidedAt = :now, decidedBy = :admin',
          ConditionExpression: '#s = :pending AND disbursementPaymentId = :p',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ...same, ':approved': 'approved', ':yes': true, ':r': payment!.receiveAmount, ':now': now, ':admin': payment!.author },
        }),
      );
      await addDisbursed(loan.natilleraId, BigInt(loan.amount.value));
      return { ...loan, status: 'approved', disbursed: true, receivedAmount: payment!.receiveAmount, disbursedAt: now };
    }
    await dynamo.send(
      new UpdateCommand({
        TableName: env.loansTable,
        Key: key,
        UpdateExpression: 'REMOVE disbursementPaymentId',
        ConditionExpression: '#s = :pending AND disbursementPaymentId = :p',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: same,
      }),
    );
    return { ...loan, disbursementPaymentId: undefined };
  } catch (error: any) {
    // Otra lectura ya lo resolvió: se relee.
    if (error?.name !== 'ConditionalCheckFailedException') throw error;
    const { Item } = await dynamo.send(new GetCommand({ TableName: env.loansTable, Key: key }));
    return (Item as LoanItem) ?? loan;
  }
};

// disbursedTotal es string (unidades menores, como todos los montos): suma con escritura condicional.
const addDisbursed = async (natilleraId: string, value: bigint) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const natillera = await getNatillera(natilleraId);
    if (!natillera) return;
    const before = natillera.disbursedTotal;
    try {
      await dynamo.send(
        new UpdateCommand({
          TableName: env.natillerasTable,
          Key: { natilleraId },
          UpdateExpression: 'SET disbursedTotal = :next',
          ConditionExpression: before === undefined ? 'attribute_not_exists(disbursedTotal)' : 'disbursedTotal = :before',
          ExpressionAttributeValues: { ':next': (BigInt(before ?? '0') + value).toString(), ...(before === undefined ? {} : { ':before': before }) },
        }),
      );
      return;
    } catch (error: any) {
      if (error?.name !== 'ConditionalCheckFailedException') throw error;
    }
  }
  console.log('disbursedTotal not updated after 5 attempts', natilleraId);
};
