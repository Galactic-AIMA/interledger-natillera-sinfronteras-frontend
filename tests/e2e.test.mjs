import test from 'node:test';
import assert from 'node:assert/strict';
const { mockApi: api } = await import('../src/api/mockApi.ts');
const { amount } = await import('../src/utils/money.ts');
const cop = (p)=>amount(String(p*100),'COP',2);

test('aporte ok', async () => {
  await api.login('rosa.gomez','x');
  const before = await api.getMyNatillera();
  assert.ok(before);
  const input={kind:'aporte',natilleraId:before.natilleraId,amount:cop(50000)};
  const q=await api.previewQuote(input);
  assert.equal(q.debitAmount.value,'5000000');
  const s=await api.startPayment(input);
  assert.match(s.redirectUrl,/^demo:/);
  assert.equal((await api.getPayment(s.paymentId)).status,'pending');
  await api.finishPayment(s.paymentId,{result:'ok',interactRef:'demo'});
  assert.equal((await api.getPayment(s.paymentId)).status,'completed');
  const after=await api.getMyNatillera();
  assert.equal(after.lastRecords[0].amount.value,'5000000');
  assert.equal(after.lastRecords.length,before.lastRecords.length+1);
  assert.equal(BigInt(after.fundTotal.value)-BigInt(before.fundTotal.value),5000000n);
  // idempotencia
  await api.finishPayment(s.paymentId,{result:'ok'});
  assert.equal((await api.getMyNatillera()).lastRecords.filter(r=>r.amount.value==='5000000').length>=1,true);
});
test('aporte rejected', async () => {
  const before = await api.getMyNatillera();
  const s=await api.startPayment({kind:'aporte',natilleraId:before.natilleraId,amount:cop(50000)});
  await api.finishPayment(s.paymentId,{result:'grant_rejected'});
  assert.equal((await api.getPayment(s.paymentId)).status,'rejected');
  const after=await api.getMyNatillera();
  assert.equal(after.fundTotal.value,before.fundTotal.value);
  assert.equal(after.lastRecords.length,before.lastRecords.length);
});
test('p2p con cuenta guardada', async () => {
  const acc=await api.saveAccount('https://ilp.interledger-test.dev/luz','Luz casa');
  assert.equal(acc.assetCode,'USD');
  assert.ok((await api.listAccounts()).some(a=>a.customWalletName==='Luz casa'));
  const input={kind:'p2p',customWalletName:'Luz casa',amount:cop(20000)};
  const q=await api.previewQuote(input);
  assert.equal(q.receiveAmount.assetCode,'USD');
  const s=await api.startPayment(input);
  await api.finishPayment(s.paymentId,{result:'ok',interactRef:'demo'});
  const p=await api.getPayment(s.paymentId);
  assert.equal(p.status,'completed'); assert.equal(p.kind,'p2p'); assert.equal(p.counterpartName,'Luz casa');
  const before=await api.getMyNatillera();
  assert.ok(!before.lastRecords.some(r=>r.amount.value==='2000000'));
  const s2=await api.startPayment(input);
  await api.finishPayment(s2.paymentId,{result:'grant_rejected'});
  assert.equal((await api.getPayment(s2.paymentId)).status,'rejected');
  await assert.rejects(()=>api.saveAccount('luz-sin-https','X'));
});
test('camino del pitch: Andrés debe una cuota, la pone en euros y queda al día', async () => {
  await api.login('andres','x');
  const before = await api.getMyNatillera();
  assert.equal(before.myStatus,'debe');
  const input={kind:'aporte',natilleraId:before.natilleraId,amount:cop(50000)};
  const s=await api.startPayment(input);
  assert.equal(s.debitAmount.assetCode,'EUR');
  assert.equal(s.receiveAmount.assetCode,'COP');
  await api.finishPayment(s.paymentId,{result:'ok',interactRef:'demo'});
  const after = await api.getMyNatillera();
  assert.equal(after.myStatus,'al-dia');
  assert.equal(after.members.find(m=>m.name==='Andrés').status,'al-dia');
});
