// POST /payments/preview — vista previa de la tasa (`previewQuote` del front).
// Es la fase 1 de Duvan (incoming payment + quote) sin pedir aprobación ni guardar nada.
// Body: el mismo de POST /payments sin `returnUrl` → { debitAmount, receiveAmount }.
// El incoming payment que se crea queda sin pagar y vence solo en la billetera de quien recibe.
import {
  currentUsername,
  getClient,
  getUser,
  HttpError,
  parseBody,
  withErrors,
} from './shared';
import { checkWalletUrl, resolveReceiver } from './start-payment-duvan';

export const handler = withErrors(async (event: any) => {
  const username = currentUsername(event);
  const body = parseBody(event);
  const user = await getUser(username);
  const client = await getClient();

  const receiver = await resolveReceiver(username, body);
  const [sender, receiving] = await Promise.all([
    client.walletAddress.get({ url: checkWalletUrl(user.walletAddress) }),
    client.walletAddress.get({ url: receiver.url }),
  ]);
  if (sender.id === receiving.id) throw new HttpError(400, 'BadRequest', 'Sender and receiver are the same wallet');

  // Igual que start-payment: monto fijo en la moneda de quien recibe.
  const amount = String(body.amount ?? body.value ?? '');
  if (!/^[1-9]\d{0,15}$/.test(amount)) {
    throw new HttpError(400, 'InvalidAmount', 'value must be a positive integer string in minor units');
  }
  if (
    body.assetCode !== undefined &&
    (body.assetCode !== receiving.assetCode || Number(body.assetScale) !== receiving.assetScale)
  ) {
    throw new HttpError(
      400,
      'InvalidAmount',
      `Amount must be in the receiver's currency (${receiving.assetCode}, scale ${receiving.assetScale})`,
    );
  }

  const incomingGrant: any = await client.grant.request(
    { url: receiving.authServer },
    { access_token: { access: [{ type: 'incoming-payment', actions: ['read', 'complete', 'create'] }] } },
  );
  const incomingPayment = await client.incomingPayment.create(
    { url: receiving.resourceServer, accessToken: incomingGrant.access_token.value },
    {
      walletAddress: receiving.id,
      incomingAmount: { assetCode: receiving.assetCode, assetScale: receiving.assetScale, value: amount },
    },
  );

  const quoteGrant: any = await client.grant.request(
    { url: sender.authServer },
    { access_token: { access: [{ type: 'quote', actions: ['create', 'read'] }] } },
  );
  const quote = await client.quote.create(
    { url: sender.resourceServer, accessToken: quoteGrant.access_token.value },
    { walletAddress: sender.id, receiver: incomingPayment.id, method: 'ilp' },
  );

  return { debitAmount: quote.debitAmount, receiveAmount: quote.receiveAmount };
});
