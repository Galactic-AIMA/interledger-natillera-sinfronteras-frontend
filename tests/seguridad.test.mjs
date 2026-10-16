import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTrustedWalletUrl, safeOrigin, antesHref, startedFlow, settleFlow, settledOutcome } from '../src/features/pagos/flow.ts';
test('urls', () => {
  assert.ok(isTrustedWalletUrl('https://auth.interledger-test.dev/interact/abc'));
  assert.ok(isTrustedWalletUrl('https://wallet.interledger-test.dev/x'));
  assert.ok(!isTrustedWalletUrl('http://auth.interledger-test.dev/x'));
  assert.ok(!isTrustedWalletUrl('https://interledger-test.dev.evil.com/x'));
  assert.ok(!isTrustedWalletUrl('https://evilinterledger-test.dev/x'));
  assert.ok(!isTrustedWalletUrl('javascript:alert(1)'));
});
test('origin', () => {
  assert.equal(safeOrigin('/pagar'), '/pagar');
  assert.equal(safeOrigin('/cuenta'), '/natillera');
  assert.equal(safeOrigin(undefined), '/natillera');
});
test('registro', () => {
  assert.equal(startedFlow('p1'), undefined);
  antesHref({ kind: 'cuota', id: 'p1', redirectUrl: 'https://auth.interledger-test.dev/i', demoTitle: '', demoDetail: '', origin: '/natillera/cuota' });
  assert.equal(startedFlow('p1')?.kind, 'cuota');
  settleFlow('p1', { tipo: 'cuota-puesta' });
  assert.equal(startedFlow('p1'), undefined);
  assert.equal(settledOutcome('p1')?.tipo, 'cuota-puesta');
  assert.equal(settledOutcome('falso'), undefined);
});
