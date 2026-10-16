// GET /payments/{id} — estado de un pago (polling de la pantalla 30).
// GET /payments      — historial de la persona (flujo 13). Requiere el GSI `author-index`
//                      (PK `author`, SK `createdAt`) en payments-history.
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  currentUsername,
  dynamo,
  env,
  getPaymentOwnedBy,
  json,
  publicPayment,
  withErrors,
  type PaymentRecord,
} from './shared';

const AUTHOR_INDEX = process.env.PAYMENTS_AUTHOR_INDEX || 'author-index';

export const handler = withErrors(async (event) => {
  const username = currentUsername(event);
  const paymentId = event?.pathParameters?.id;

  if (paymentId) return json(200, publicPayment(await getPaymentOwnedBy(paymentId, username)));

  const { Items = [] } = await dynamo.send(
    new QueryCommand({
      TableName: env.paymentsTable,
      IndexName: AUTHOR_INDEX,
      KeyConditionExpression: '#a = :a',
      ExpressionAttributeNames: { '#a': 'author' },
      ExpressionAttributeValues: { ':a': username },
      ScanIndexForward: false,
      Limit: 50,
    }),
  );
  return json(200, (Items as PaymentRecord[]).map(publicPayment));
});
