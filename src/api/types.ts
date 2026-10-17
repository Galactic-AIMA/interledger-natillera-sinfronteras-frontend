// Tipos del contrato front ↔ back (docs/api-contrato.md). Montos siempre en unidades menores, como Open Payments.

export type Amount = {
  value: string;
  assetCode: string;
  assetScale: number;
};

export type WalletInfo = {
  exists: boolean;
  walletAddress: string;
  assetCode?: string;
  assetScale?: number;
};

export type User = {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  phone: string;
  walletAddress: string;
  assetCode: string;
  assetScale: number;
};

export type SignupInput = {
  username: string;
  /** Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo (política de Cognito). */
  password: string;
  email: string;
  /** Formato internacional sin espacios: +57 y el número. Va a Cognito como `phone_number`. */
  phone: string;
  /** URL (o id) de la Test Wallet del usuario. Va a Cognito como `custom:walletId`; el back la verifica. */
  walletAddress: string;
};

export type MemberStatus = 'al-dia' | 'debe';

export type Member = {
  userId: string;
  name: string;
  isAdmin: boolean;
  total: Amount;
  status: MemberStatus;
  // Cuotas pendientes cuando status = 'debe'.
  pendingCount: number;
};

export type NatilleraRecord = {
  id: string;
  // A nombre de quién quedó el aporte.
  authorName: string;
  // Quién lo pagó (puede ser otra persona de la familia).
  paidByName: string;
  amount: Amount;
  createdAt: string;
};

export type Natillera = {
  natilleraId: string;
  natilleraName: string;
  walletAddress: string;
  asset: { assetCode: string; assetScale: number };
  // Cuota sugerida por periodo.
  quota: Amount;
  invitationCode: string;
  joinUrl: string;
  isAdmin: boolean;
  fundTotal: Amount;
  myTotal: Amount;
  myStatus: MemberStatus;
  members: Member[];
  lastRecords: NatilleraRecord[];
};

/** Resumen para el selector de natilleras (una persona puede estar en varias). */
export type NatilleraSummary = {
  natilleraId: string;
  natilleraName: string;
  isAdmin: boolean;
  membersCount: number;
  asset: { assetCode: string; assetScale: number };
  quota: Amount;
};

export type CreateNatilleraInput = { natilleraName: string; walletAddress: string };

export type InvitationPreview = {
  code: string;
  natilleraName: string;
  adminName: string;
  quota: Amount;
};

export type PaymentKind = 'p2p' | 'aporte' | 'prestamo';

export type PaymentStatus = 'pending' | 'completed' | 'rejected' | 'failed';

export type Payment = {
  paymentId: string;
  kind: PaymentKind;
  status: PaymentStatus;
  counterpartName: string;
  debitAmount?: Amount;
  receiveAmount?: Amount;
  createdAt: string;
};

export type StartPaymentInput =
  | { kind: 'p2p'; customWalletName: string; amount: Amount }
  // Pago directo a una billetera sin cuenta guardada (colectas de Metas). El back lo acepta como `walletAddress`.
  | { kind: 'p2p'; walletAddress: string; counterpartName: string; amount: Amount }
  | { kind: 'aporte'; natilleraId: string; onBehalfOfUserId?: string; amount: Amount };

// Respuesta de "iniciar": la app abre redirectUrl en la billetera.
export type WalletRedirect = {
  paymentId: string;
  redirectUrl: string;
  debitAmount?: Amount;
  receiveAmount?: Amount;
};

export type SavedAccount = {
  customWalletName: string;
  walletAddress: string;
  assetCode: string;
  assetScale: number;
};

export type QuotePreview = {
  debitAmount: Amount;
  receiveAmount: Amount;
  fee?: Amount;
};

export type RecurringInput = {
  natilleraId: string;
  onBehalfOfUserId?: string;
  amount: Amount;
};

export type RecurringGrant = {
  grantId: string;
  redirectUrl: string;
  limitPerCharge: Amount;
  repetitions: number;
  status: 'pending' | 'active' | 'rejected';
};

export type InstallmentStatus = 'pagada' | 'pendiente' | 'en-mora';

export type Installment = {
  n: number;
  capital: Amount;
  interest: Amount;
  total: Amount;
  status: InstallmentStatus;
};

export type LoanSimulation = {
  amount: Amount;
  installments: number;
  // Lo que le llega a quien pide, en su moneda.
  receiveAmount: Amount;
  highestInstallment: Amount;
  schedule: Installment[];
};

export type LoanRequestStatus = 'pending' | 'approved' | 'rejected';

export type LoanRequest = {
  requestId: string;
  natilleraId: string;
  requesterName: string;
  amount: Amount;
  installments: number;
  repaymentAuthorized: boolean;
  status: LoanRequestStatus;
  createdAt: string;
};

export type Loan = {
  loanId: string;
  request: LoanRequest;
  disbursed: boolean;
  receivedAmount?: Amount;
  balance: Amount;
  schedule: Installment[];
};

export type MyLoans = {
  request: LoanRequest | null;
  loan: Loan | null;
};

export type LoanDecisionResult = { status: 'rejected' } | ({ status: 'approved' } & WalletRedirect);

// Lo que vuelve de la billetera por natillera://retorno.
export type WalletReturn = {
  paymentId?: string;
  grantId?: string;
  interactRef?: string;
  hash?: string;
  result?: string;
};

// ── Metas (pantallas 36–38) ──────────────────────────────────────────────────────
// Por ahora solo viven en el front (decisión de Camilo, 2026-10-16): el back no guarda a qué meta
// va un pago. Las colectas sí mueven plata real con un pago p2p a la billetera del beneficiario.

/** ahorro = bolsillo del fondo (se aparta plata); colecta = aportes directos a la billetera de alguien. */
export type GoalMode = 'ahorro' | 'colecta';

export type GoalContribution = {
  id: string;
  authorName: string;
  // Lo que sumó a la meta, en la moneda de la meta.
  amount: Amount;
  // Lo que salió de la billetera de quien aportó, si fue en otra moneda.
  sent?: Amount;
  createdAt: string;
};

export type Goal = {
  goalId: string;
  mode: GoalMode;
  name: string;
  target: Amount;
  // Fecha límite AAAA-MM-DD.
  deadline: string;
  // Solo colectas: a quién le llega la plata.
  beneficiaryName?: string;
  beneficiaryWallet?: string;
  raised: Amount;
  contributions: GoalContribution[];
  createdByName: string;
  createdAt: string;
};

export type CreateGoalInput = {
  mode: GoalMode;
  name: string;
  target: Amount;
  deadline: string;
  beneficiaryName?: string;
  beneficiaryWallet?: string;
};

export type AddGoalContributionInput = {
  amount: Amount;
  sent?: Amount;
  // Pago real (colecta) que respalda el aporte.
  paymentId?: string;
};
