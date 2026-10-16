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
  password: string;
  email: string;
  phone: string;
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
