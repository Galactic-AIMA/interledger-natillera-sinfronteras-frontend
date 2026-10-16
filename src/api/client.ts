import type {
  AddGoalContributionInput,
  Amount,
  CreateGoalInput,
  Goal,
  CreateNatilleraInput,
  InvitationPreview,
  LoanDecisionResult,
  LoanRequest,
  LoanSimulation,
  MyLoans,
  Natillera,
  Payment,
  QuotePreview,
  RecurringGrant,
  RecurringInput,
  SavedAccount,
  SignupInput,
  StartPaymentInput,
  User,
  WalletInfo,
  WalletRedirect,
  WalletReturn,
} from './types';

/**
 * Interfaz única de datos. Las pantallas solo hablan con esto (vía `useApi()`),
 * nunca con fetch. La implementan `httpApi` (AWS) y `mockApi` (modo demo).
 */
export interface NatilleraApi {
  readonly mode: 'real' | 'demo';

  // Cuenta (flujos 1, 2, 13)
  signup(input: SignupInput): Promise<void>;
  login(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  hasSession(): Promise<boolean>;
  getMe(): Promise<User>;
  verifyWallet(walletAddress: string): Promise<WalletInfo>;

  // Natillera (flujos 7, 8, 13)
  getMyNatillera(): Promise<Natillera | null>;
  createNatillera(input: CreateNatilleraInput): Promise<Natillera>;
  getInvitation(code: string): Promise<InvitationPreview>;
  joinNatillera(code: string): Promise<Natillera>;

  // Pagos (flujos 3, 4, 5, 6, 9)
  // Estimado antes de ir a la billetera; null si el back aún no lo ofrece.
  previewQuote(input: StartPaymentInput): Promise<QuotePreview | null>;
  startPayment(input: StartPaymentInput): Promise<WalletRedirect>;
  finishPayment(paymentId: string, ret: WalletReturn): Promise<Payment>;
  getPayment(paymentId: string): Promise<Payment>;
  listPayments(): Promise<Payment[]>;
  listAccounts(): Promise<SavedAccount[]>;
  saveAccount(walletAddress: string, customWalletName: string): Promise<SavedAccount>;

  // Cuota automática (flujo 12)
  startRecurring(input: RecurringInput): Promise<RecurringGrant>;
  finishRecurring(grantId: string, ret: WalletReturn): Promise<RecurringGrant>;
  chargeRecurringNow(grantId: string): Promise<Payment>;

  // Préstamos (flujos 10, 11, 12B)
  simulateLoan(amount: Amount, installments: number): Promise<LoanSimulation>;
  requestLoan(natilleraId: string, amount: Amount, installments: number): Promise<LoanRequest>;
  startLoanRepaymentGrant(requestId: string): Promise<RecurringGrant>;
  finishLoanRepaymentGrant(grantId: string, ret: WalletReturn): Promise<RecurringGrant>;
  getMyLoans(): Promise<MyLoans>;
  listPendingLoanRequests(): Promise<LoanRequest[]>;
  decideLoan(requestId: string, accepted: boolean): Promise<LoanDecisionResult>;

  // Metas (36–38): solo en el front por ahora; ver goalStore.ts.
  listGoals(): Promise<Goal[]>;
  getGoal(goalId: string): Promise<Goal>;
  createGoal(input: CreateGoalInput): Promise<Goal>;
  addGoalContribution(goalId: string, input: AddGoalContributionInput): Promise<Goal>;
}

/** Error con mensaje listo para mostrar en pantalla (en "usted", sin jerga). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number = 0,
    readonly code: string = 'error',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
