import { amount, formatAmount } from '@/utils/money';

import { ApiError, type NatilleraApi } from './client';
import { createGoalStore } from './goalStore';
import type {
  Amount,
  Goal,
  Installment,
  LoanRequest,
  LoanSimulation,
  Member,
  Natillera,
  NatilleraRecord,
  Payment,
  RecurringGrant,
  SavedAccount,
  StartPaymentInput,
  User,
  WalletReturn,
} from './types';

// Modo demo: datos en memoria con la familia de los bocetos. Sirve para desarrollar sin back
// y como plan B del pitch si AWS o la Test Wallet fallan.

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();
let counter = 1000;
const newId = (prefix: string) => `${prefix}-${++counter}`;

// Pesos colombianos por unidad de cada moneda (valores de ejemplo, como en Figma).
const COP_PER_UNIT: Record<string, number> = { COP: 1, USD: 4019, EUR: 4545 };
// Costo del envío de ejemplo (~1,2 %, como "0,13 €" sobre "11,00 €").
const FEE_RATE = 0.012;
const LOAN_RATE_PER_PERIOD = 0.01;

const toMajor = (a: Amount) => Number(a.value) / 10 ** a.assetScale;
const fromMajor = (major: number, assetCode: string, assetScale = 2): Amount =>
  amount(String(Math.round(major * 10 ** assetScale)), assetCode, assetScale);
const convert = (a: Amount, assetCode: string): Amount =>
  fromMajor((toMajor(a) * (COP_PER_UNIT[a.assetCode] ?? 1)) / (COP_PER_UNIT[assetCode] ?? 1), assetCode);
const add = (a: Amount, b: Amount): Amount => amount(String(BigInt(a.value) + BigInt(b.value)), a.assetCode, a.assetScale);
const cop = (pesos: number) => fromMajor(pesos, 'COP');

type DemoUser = User & { password: string };

const users: DemoUser[] = [
  { userId: 'u-rosa', username: 'rosa.gomez', displayName: 'Doña Rosa', email: 'rosa@correo.com', phone: '+57 300 555 0101', walletAddress: 'https://ilp.interledger-test.dev/rosa', assetCode: 'COP', assetScale: 2, password: 'demo' },
  { userId: 'u-luz', username: 'luz', displayName: 'Luz', email: 'luz@correo.com', phone: '+1 305 555 0102', walletAddress: 'https://ilp.interledger-test.dev/luz', assetCode: 'USD', assetScale: 2, password: 'demo' },
  { userId: 'u-andres', username: 'andres', displayName: 'Andrés', email: 'andres@correo.com', phone: '+34 600 555 0103', walletAddress: 'https://ilp.interledger-test.dev/andres', assetCode: 'EUR', assetScale: 2, password: 'demo' },
];

type NatilleraState = {
  natilleraId: string;
  natilleraName: string;
  walletAddress: string;
  adminId: string;
  memberIds: string[];
  quota: Amount;
  invitationCode: string;
  records: (NatilleraRecord & { authorId: string })[];
  disbursed: Amount;
};

const natilleras: NatilleraState[] = [
  {
    natilleraId: 'n-rosa',
    natilleraName: 'Natillera Familia Rosa',
    walletAddress: 'https://ilp.interledger-test.dev/natillera-rosa',
    adminId: 'u-rosa',
    memberIds: ['u-rosa', 'u-luz', 'u-andres'],
    quota: cop(50000),
    invitationCode: 'ROSA-4821',
    records: [
      { id: 'r-1', authorId: 'u-rosa', authorName: 'Doña Rosa', paidByName: 'Doña Rosa', amount: cop(50000), createdAt: '2026-08-15T14:00:00Z' },
      { id: 'r-2', authorId: 'u-rosa', authorName: 'Doña Rosa', paidByName: 'Doña Rosa', amount: cop(50000), createdAt: '2026-09-15T14:00:00Z' },
      { id: 'r-3', authorId: 'u-rosa', authorName: 'Doña Rosa', paidByName: 'Doña Rosa', amount: cop(50000), createdAt: '2026-10-15T14:00:00Z' },
    ],
    disbursed: cop(0),
  },
];

const accounts: Record<string, SavedAccount[]> = {
  'u-rosa': [{ customWalletName: 'Luz', walletAddress: 'https://ilp.interledger-test.dev/luz', assetCode: 'USD', assetScale: 2 }],
};

type PendingPayment = Payment & { userId: string; input?: StartPaymentInput; loanRequestId?: string };
const payments: PendingPayment[] = [];
const grants: (RecurringGrant & { userId: string; kind: 'aporte' | 'loan'; input?: StartPaymentInput; loanRequestId?: string })[] = [];
const loanRequests: (LoanRequest & { userId: string })[] = [];
const loans: Record<string, { disbursed: boolean; receivedAmount?: Amount; paidCount: number }> = {};

// Metas de ejemplo de la Familia Rosa: una colecta con aportes en tres monedas y un ahorro.
const goalSeed: Goal[] = [
  {
    goalId: 'g-cirugia',
    mode: 'colecta',
    name: 'Cirugía de la abuela Carmen',
    target: cop(3000000),
    deadline: '2026-11-15',
    beneficiaryName: 'Abuela Carmen',
    // Billetera COP real de la Test Wallet (la de David): /carmen no existe y la colecta fallaba con «Could not get wallet address».
    beneficiaryWallet: 'https://ilp.interledger-test.dev/cirocol',
    raised: cop(1257350),
    contributions: [
      { id: 'c-1', authorName: 'Andrés', amount: cop(454500), sent: fromMajor(100, 'EUR'), createdAt: '2026-10-14T18:00:00Z' },
      { id: 'c-2', authorName: 'Luz', amount: cop(602850), sent: fromMajor(150, 'USD'), createdAt: '2026-10-13T22:00:00Z' },
      { id: 'c-3', authorName: 'Doña Rosa', amount: cop(200000), createdAt: '2026-10-12T15:00:00Z' },
    ],
    createdByName: 'Doña Rosa',
    createdAt: '2026-10-12T14:00:00Z',
  },
  {
    goalId: 'g-navidad',
    mode: 'ahorro',
    name: 'Navidad en familia',
    target: cop(600000),
    deadline: '2026-12-20',
    raised: cop(100000),
    contributions: [{ id: 'c-4', authorName: 'Doña Rosa', amount: cop(100000), createdAt: '2026-10-15T15:00:00Z' }],
    createdByName: 'Doña Rosa',
    createdAt: '2026-10-01T14:00:00Z',
  },
];
const goalStore = createGoalStore(goalSeed);

let currentUserId: string | null = null;

function me(): DemoUser {
  const user = users.find((u) => u.userId === currentUserId);
  if (!user) throw new ApiError('Su sesión se cerró. Vuelva a entrar.', 401, 'unauthorized');
  return user;
}

function myNatilleraState(userId: string) {
  return natilleras.find((n) => n.memberIds.includes(userId)) ?? null;
}

function totalFor(n: NatilleraState, userId?: string): Amount {
  return n.records.filter((r) => !userId || r.authorId === userId).reduce((acc, r) => add(acc, r.amount), cop(0));
}

function toNatillera(n: NatilleraState, userId: string): Natillera {
  // Cuotas exigidas a la fecha en el demo: con 1, Luz y Andrés deben una y quedan al día al poner
  // la cuota (camino del pitch). Antes eran 2 y Andrés seguía «Debe» después de pagar.
  const periodsDue = 1;
  const members: Member[] = n.memberIds.map((id) => {
    const user = users.find((u) => u.userId === id);
    const total = totalFor(n, id);
    const paid = n.records.filter((r) => r.authorId === id).length;
    const pending = Math.max(0, periodsDue - paid);
    return { userId: id, name: user?.displayName ?? id, isAdmin: id === n.adminId, total, status: pending > 0 ? 'debe' : 'al-dia', pendingCount: pending };
  });
  const mine = members.find((m) => m.userId === userId);
  const fund = amount(String(BigInt(totalFor(n).value) - BigInt(n.disbursed.value)), 'COP', 2);
  return {
    natilleraId: n.natilleraId,
    natilleraName: n.natilleraName,
    walletAddress: n.walletAddress,
    asset: { assetCode: 'COP', assetScale: 2 },
    quota: n.quota,
    invitationCode: n.invitationCode,
    joinUrl: `https://natillera.example/unirse/${n.invitationCode}`,
    isAdmin: n.adminId === userId,
    fundTotal: fund,
    myTotal: mine?.total ?? cop(0),
    myStatus: mine?.status ?? 'al-dia',
    members,
    lastRecords: [...n.records].reverse().slice(0, 5),
  };
}

function quoteFor(input: StartPaymentInput, payer: DemoUser) {
  const receiverAsset =
    input.kind === 'aporte'
      ? 'COP'
      : 'walletAddress' in input
        ? (users.find((u) => u.walletAddress === input.walletAddress)?.assetCode ?? input.amount.assetCode)
        : (accounts[payer.userId]?.find((a) => a.customWalletName === input.customWalletName)?.assetCode ?? 'COP');
  const debitBase = convert(input.amount, payer.assetCode);
  const fee = fromMajor(toMajor(debitBase) * FEE_RATE, payer.assetCode);
  const debitAmount = payer.assetCode === input.amount.assetCode ? input.amount : add(debitBase, fee);
  return { debitAmount, receiveAmount: convert(input.amount, receiverAsset), fee };
}

function simulate(value: Amount, installments: number, receiverAsset: string): LoanSimulation {
  const capital = Number(value.value) / installments;
  const schedule: Installment[] = Array.from({ length: installments }, (_, i) => {
    const balance = Number(value.value) - capital * i;
    const interest = Math.round(balance * LOAN_RATE_PER_PERIOD);
    const cap = Math.round(capital);
    return { n: i + 1, capital: amount(String(cap), 'COP', 2), interest: amount(String(interest), 'COP', 2), total: amount(String(cap + interest), 'COP', 2), status: 'pendiente' };
  });
  return { amount: value, installments, receiveAmount: convert(value, receiverAsset), highestInstallment: schedule[0]?.total ?? value, schedule };
}

const demoRedirect = (id: string) => `demo://billetera?id=${id}`;

export const mockApi: NatilleraApi & { switchUser(username: string): void } = {
  mode: 'demo',

  switchUser(username) {
    const user = users.find((u) => u.username === username);
    if (user) currentUserId = user.userId;
  },

  async signup(input) {
    await wait();
    if (users.some((u) => u.username === input.username)) throw new ApiError('Ese usuario ya existe. Pruebe con otro.', 409);
    users.push({ userId: newId('u'), displayName: input.username, assetCode: 'COP', assetScale: 2, ...input });
  },
  async login(username, password) {
    await wait();
    const user = users.find((u) => u.username === username.trim());
    // En demo cualquier contraseña sirve para los usuarios de ejemplo.
    if (!user || (!user.password.startsWith('demo') && user.password !== password)) throw new ApiError('Usuario o contraseña incorrectos.', 401);
    currentUserId = user.userId;
  },
  async logout() {
    currentUserId = null;
  },
  async hasSession() {
    return currentUserId !== null;
  },
  async getMe() {
    await wait(150);
    const { password: _password, ...user } = me();
    return user;
  },
  async verifyWallet(walletAddress) {
    await wait();
    const ok = /^https:\/\/.+\/.+/.test(walletAddress.trim());
    const known = users.find((u) => u.walletAddress === walletAddress.trim());
    return { exists: ok, walletAddress, assetCode: ok ? (known?.assetCode ?? (walletAddress.includes('luz') ? 'USD' : 'COP')) : undefined, assetScale: ok ? 2 : undefined };
  },

  async getMyNatillera(natilleraId) {
    await wait(200);
    const user = me();
    if (natilleraId) {
      const chosen = natilleras.find((x) => x.natilleraId === natilleraId && x.memberIds.includes(user.userId));
      if (!chosen) throw new ApiError('No encontramos esa natillera.', 404, 'NatilleraNotFound');
      return toNatillera(chosen, user.userId);
    }
    const n = myNatilleraState(user.userId);
    return n ? toNatillera(n, user.userId) : null;
  },
  async listMyNatilleras() {
    await wait(150);
    const user = me();
    return natilleras
      .filter((n) => n.memberIds.includes(user.userId))
      .map((n) => ({ natilleraId: n.natilleraId, natilleraName: n.natilleraName, isAdmin: n.adminId === user.userId, membersCount: n.memberIds.length, asset: { assetCode: 'COP', assetScale: 2 }, quota: n.quota }));
  },
  async createNatillera(input) {
    await wait();
    const user = me();
    const code = `${(user.displayName.split(' ').pop() ?? 'NAT').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'NAT'}-${Math.floor(1000 + Math.random() * 9000)}`;
    const n: NatilleraState = { natilleraId: newId('n'), natilleraName: input.natilleraName, walletAddress: input.walletAddress, adminId: user.userId, memberIds: [user.userId], quota: cop(50000), invitationCode: code, records: [], disbursed: cop(0) };
    natilleras.push(n);
    return toNatillera(n, user.userId);
  },
  async getInvitation(code) {
    await wait();
    const n = natilleras.find((x) => x.invitationCode === code.trim().toUpperCase());
    if (!n) throw new ApiError('No encontramos esa invitación. Revise el código.', 404);
    const admin = users.find((u) => u.userId === n.adminId);
    return { code: n.invitationCode, natilleraName: n.natilleraName, adminName: admin?.displayName ?? '', quota: n.quota };
  },
  async joinNatillera(code) {
    await wait();
    const user = me();
    const n = natilleras.find((x) => x.invitationCode === code.trim().toUpperCase());
    if (!n) throw new ApiError('No encontramos esa invitación. Revise el código.', 404);
    if (!n.memberIds.includes(user.userId)) n.memberIds.push(user.userId);
    return toNatillera(n, user.userId);
  },

  async previewQuote(input) {
    await wait(250);
    return quoteFor(input, me());
  },
  async startPayment(input) {
    await wait();
    const user = me();
    const q = quoteFor(input, user);
    const counterpartName =
      input.kind === 'aporte' ? (myNatilleraState(user.userId)?.natilleraName ?? 'Natillera') : 'walletAddress' in input ? input.counterpartName : input.customWalletName;
    const payment: PendingPayment = { paymentId: newId('p'), kind: input.kind, status: 'pending', counterpartName, debitAmount: q.debitAmount, receiveAmount: q.receiveAmount, createdAt: now(), userId: user.userId, input };
    payments.unshift(payment);
    return { paymentId: payment.paymentId, redirectUrl: demoRedirect(payment.paymentId), debitAmount: q.debitAmount, receiveAmount: q.receiveAmount };
  },
  async finishPayment(paymentId, ret) {
    await wait(600);
    const payment = payments.find((p) => p.paymentId === paymentId);
    if (!payment) throw new ApiError('No encontramos ese pago.', 404);
    if (payment.status !== 'pending') return payment;
    payment.status = ret.result === 'grant_rejected' || ret.result === 'rejected' ? 'rejected' : 'completed';
    if (payment.status === 'completed' && payment.input?.kind === 'aporte') {
      const n = natilleras.find((x) => x.natilleraId === (payment.input as { natilleraId: string }).natilleraId);
      const authorId = payment.input.onBehalfOfUserId ?? payment.userId;
      const author = users.find((u) => u.userId === authorId);
      const payer = users.find((u) => u.userId === payment.userId);
      n?.records.push({ id: newId('r'), authorId, authorName: author?.displayName ?? '', paidByName: payer?.displayName ?? '', amount: payment.input.amount, createdAt: now() });
    }
    if (payment.status === 'completed' && payment.kind === 'prestamo' && payment.loanRequestId) {
      const request = loanRequests.find((r) => r.requestId === payment.loanRequestId);
      if (request) {
        request.status = 'approved';
        loans[request.requestId] = { disbursed: true, receivedAmount: payment.receiveAmount, paidCount: 0 };
        const n = natilleras.find((x) => x.natilleraId === request.natilleraId);
        if (n) n.disbursed = add(n.disbursed, request.amount);
      }
    }
    return payment;
  },
  async getPayment(paymentId) {
    await wait(200);
    const payment = payments.find((p) => p.paymentId === paymentId);
    if (!payment) throw new ApiError('No encontramos ese pago.', 404);
    return payment;
  },
  async listPayments() {
    await wait(200);
    const user = me();
    return payments.filter((p) => p.userId === user.userId);
  },
  async listAccounts() {
    await wait(200);
    return accounts[me().userId] ?? [];
  },
  async saveAccount(walletAddress, customWalletName) {
    await wait();
    const user = me();
    const info = await mockApi.verifyWallet(walletAddress);
    if (!info.exists) throw new ApiError('No encontramos esa billetera. Revise la dirección.', 404);
    const account: SavedAccount = { customWalletName, walletAddress, assetCode: info.assetCode ?? 'COP', assetScale: 2 };
    accounts[user.userId] = [...(accounts[user.userId] ?? []).filter((a) => a.customWalletName !== customWalletName), account];
    return account;
  },

  async startRecurring(input) {
    await wait();
    const user = me();
    const q = quoteFor({ kind: 'aporte', natilleraId: input.natilleraId, onBehalfOfUserId: input.onBehalfOfUserId, amount: input.amount }, user);
    const grant = { grantId: newId('g'), redirectUrl: '', limitPerCharge: q.debitAmount, repetitions: 24, status: 'pending' as const, userId: user.userId, kind: 'aporte' as const, input: { kind: 'aporte' as const, natilleraId: input.natilleraId, onBehalfOfUserId: input.onBehalfOfUserId, amount: input.amount } };
    grant.redirectUrl = demoRedirect(grant.grantId);
    grants.push(grant);
    return grant;
  },
  async finishRecurring(grantId, ret) {
    await wait(600);
    const grant = grants.find((g) => g.grantId === grantId);
    if (!grant) throw new ApiError('No encontramos ese permiso.', 404);
    grant.status = ret.result === 'grant_rejected' ? 'rejected' : 'active';
    return grant;
  },
  async chargeRecurringNow(grantId) {
    await wait();
    const grant = grants.find((g) => g.grantId === grantId && g.status === 'active');
    if (!grant?.input) throw new ApiError('Ese cobro automático no está activo.', 409);
    const started = await mockApi.startPayment(grant.input);
    return mockApi.finishPayment(started.paymentId, { result: 'ok' });
  },

  async simulateLoan(value, installments) {
    await wait(200);
    return simulate(value, installments, me().assetCode);
  },
  async requestLoan(natilleraId, value, installments) {
    await wait();
    const user = me();
    const request = { requestId: newId('l'), natilleraId, requesterName: user.displayName, amount: value, installments, repaymentAuthorized: false, status: 'pending' as const, createdAt: now(), userId: user.userId };
    loanRequests.push(request);
    return request;
  },
  async startLoanRepaymentGrant(requestId) {
    await wait();
    const user = me();
    const request = loanRequests.find((r) => r.requestId === requestId);
    if (!request) throw new ApiError('No encontramos esa solicitud.', 404);
    const sim = simulate(request.amount, request.installments, user.assetCode);
    const grant = { grantId: newId('g'), redirectUrl: '', limitPerCharge: convert(sim.highestInstallment, user.assetCode), repetitions: request.installments, status: 'pending' as const, userId: user.userId, kind: 'loan' as const, loanRequestId: requestId };
    grant.redirectUrl = demoRedirect(grant.grantId);
    grants.push(grant);
    return grant;
  },
  async finishLoanRepaymentGrant(grantId, ret) {
    await wait(600);
    const grant = grants.find((g) => g.grantId === grantId);
    if (!grant) throw new ApiError('No encontramos ese permiso.', 404);
    grant.status = ret.result === 'grant_rejected' ? 'rejected' : 'active';
    const request = loanRequests.find((r) => r.requestId === grant.loanRequestId);
    if (request && grant.status === 'active') request.repaymentAuthorized = true;
    return grant;
  },
  async getMyLoans() {
    await wait(200);
    const user = me();
    const request = [...loanRequests].reverse().find((r) => r.userId === user.userId) ?? null;
    if (!request) return { request: null, loan: null };
    const state = loans[request.requestId];
    if (!state) return { request, loan: null };
    const sim = simulate(request.amount, request.installments, user.assetCode);
    const schedule = sim.schedule.map((i) => ({ ...i, status: i.n <= state.paidCount ? ('pagada' as const) : ('pendiente' as const) }));
    const paidCapital = schedule.filter((i) => i.status === 'pagada').reduce((acc, i) => acc + Number(i.capital.value), 0);
    return {
      request,
      loan: { loanId: `loan-${request.requestId}`, request, disbursed: state.disbursed, receivedAmount: state.receivedAmount, balance: amount(String(Number(request.amount.value) - paidCapital), 'COP', 2), schedule },
    };
  },
  async listPendingLoanRequests() {
    await wait(200);
    const user = me();
    const n = myNatilleraState(user.userId);
    if (!n || n.adminId !== user.userId) return [];
    return loanRequests.filter((r) => r.natilleraId === n.natilleraId && r.status === 'pending');
  },
  async decideLoan(requestId, accepted) {
    await wait();
    const request = loanRequests.find((r) => r.requestId === requestId);
    if (!request) throw new ApiError('No encontramos esa solicitud.', 404);
    if (!accepted) {
      request.status = 'rejected';
      return { status: 'rejected' };
    }
    const borrower = users.find((u) => u.userId === request.userId);
    const receiveAmount = convert(request.amount, borrower?.assetCode ?? 'COP');
    const payment: PendingPayment = { paymentId: newId('p'), kind: 'prestamo', status: 'pending', counterpartName: request.requesterName, debitAmount: request.amount, receiveAmount, createdAt: now(), userId: me().userId, loanRequestId: requestId };
    payments.unshift(payment);
    return { status: 'approved', paymentId: payment.paymentId, redirectUrl: demoRedirect(payment.paymentId), debitAmount: request.amount, receiveAmount };
  },

  async listGoals() {
    await wait(200);
    me();
    return goalStore.list();
  },
  async getGoal(goalId) {
    await wait(150);
    me();
    return goalStore.get(goalId);
  },
  async createGoal(input) {
    await wait();
    return goalStore.create(input, me().displayName);
  },
  async addGoalContribution(goalId, input) {
    await wait();
    const user = me();
    const goal = goalStore.get(goalId);
    // Ahorro = bolsillo del fondo: solo se aparta lo que el fondo tiene libre.
    if (goal.mode === 'ahorro' && !input.paymentId) {
      const n = myNatilleraState(user.userId);
      const fund = n ? BigInt(totalFor(n).value) - BigInt(n.disbursed.value) : 0n;
      const reserved = goalStore.list().filter((g) => g.mode === 'ahorro').reduce((acc, g) => acc + BigInt(g.raised.value), 0n);
      const free = fund - reserved;
      if (BigInt(input.amount.value) > free) {
        throw new ApiError(`El fondo solo tiene ${formatAmount(amount(String(free > 0n ? free : 0n), 'COP'))} libres para apartar.`, 400, 'insufficient');
      }
    }
    return goalStore.contribute(goalId, input, user.displayName);
  },
};

/** Usuarios de ejemplo para el selector de la pantalla 04 en modo demo. */
export const demoUsers = users.slice(0, 3).map(({ username, displayName }) => ({ username, displayName }));

export type { WalletReturn };
