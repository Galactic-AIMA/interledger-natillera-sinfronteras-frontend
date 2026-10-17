// Modo híbrido con natillera, cuentas y pagos reales: qué va al back y qué sigue de ejemplo.
// Sin red: fetch falso para Cognito y el API.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.EXPO_PUBLIC_API_URL = 'https://api.test/dev';
process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID = 'cliente-prueba';
process.env.EXPO_PUBLIC_AUTH_TOKEN_TYPE = 'id';
process.env.EXPO_PUBLIC_REAL_METHODS = 'getMyNatillera,listAccounts,saveAccount,startPayment,finishPayment,getPayment,listPayments';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const idToken = `${b64({ alg: 'none' })}.${b64({ sub: 'sub-andres', 'cognito:username': 'prueba3', exp: 9999999999 })}.firma`;
const eur = (v) => ({ value: v, assetCode: 'EUR', assetScale: 2 });

const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  if (u.includes('cognito-idp')) {
    return reply(200, { AuthenticationResult: { AccessToken: 'acceso', IdToken: idToken, RefreshToken: 'refresh', ExpiresIn: 3600 } });
  }
  const path = u.replace('https://api.test/dev', '');
  const body = init.body ? JSON.parse(init.body) : undefined;
  calls.push({ method: init.method ?? 'GET', path, body, auth: init.headers?.Authorization ?? init.headers?.authorization });
  if (path === '/natilleras/mine') {
    return reply(200, {
      natilleraId: 'n-real', natilleraName: 'Familia Real', walletAddress: 'https://ilp.interledger-test.dev/fondo',
      asset: { assetCode: 'EUR', assetScale: 2 }, quota: eur('1100'), invitationCode: 'REAL-1', joinUrl: 'natillera://unirse/REAL-1',
      isAdmin: false, fundTotal: eur('0'), myTotal: eur('0'), myStatus: 'debe', members: [], lastRecords: [],
    });
  }
  if (path === '/payments' && init.method === 'POST') {
    return reply(201, { paymentId: 'pay-1', redirectUrl: 'https://auth.interledger-test.dev/x', debitAmount: { value: '450000', assetCode: 'COP', assetScale: 2 }, receiveAmount: eur('1100') });
  }
  if (path === '/payments/pay-1') return reply(200, { paymentId: 'pay-1', kind: 'aporte', status: 'completed', counterpartName: 'Familia Real', receiveAmount: eur('1100'), createdAt: '2026-10-17T00:00:00Z' });
  return reply(404, { error: 'NotFound' });
};

const { hybridApi: api } = await import('../src/api/hybridApi.ts');

test('la cuota va al back cuando la natillera es real', async () => {
  await api.login('prueba3', 'Clave-123');
  const natillera = await api.getMyNatillera();
  assert.equal(natillera?.natilleraId, 'n-real');

  const input = { kind: 'aporte', natilleraId: 'n-real', amount: natillera.quota };
  // Sin vista previa en el back: nada de tasas inventadas.
  assert.equal(await api.previewQuote(input), null);

  const start = await api.startPayment(input);
  assert.equal(start.paymentId, 'pay-1');
  const post = calls.find((c) => c.method === 'POST' && c.path === '/payments');
  assert.deepEqual({ kind: post.body.kind, natilleraId: post.body.natilleraId, value: post.body.value, assetCode: post.body.assetCode }, { kind: 'aporte', natilleraId: 'n-real', value: '1100', assetCode: 'EUR' });
  assert.equal(post.body.returnUrl, 'natillera://retorno');
  assert.equal(post.auth, `Bearer ${idToken}`);

  // Vuelta de la opción B (sin interact_ref): se consulta el estado, no se finaliza dos veces.
  const done = await api.finishPayment('pay-1', { result: 'ok', paymentId: 'pay-1' });
  assert.equal(done.status, 'completed');
  assert.ok(!calls.some((c) => c.path === '/payments/pay-1/finish'));
});

test('la cuenta guardada real viaja por nombre al back (no la de ejemplo)', async () => {
  calls.length = 0;
  await api.startPayment({ kind: 'p2p', customWalletName: 'Luz', amount: eur('500') });
  const post = calls.find((c) => c.method === 'POST' && c.path === '/payments');
  assert.equal(post.body.customWalletName, 'Luz');
  assert.equal(post.body.walletAddress, undefined);
});

test('lo que el back no tiene sigue de ejemplo', async () => {
  calls.length = 0;
  const loans = await api.getMyLoans();
  assert.ok(loans);
  assert.equal(calls.length, 0);
});
