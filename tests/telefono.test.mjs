import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, DEFAULT_COUNTRY, flagOf, searchCountries, toE164 } from '../src/features/telefono/countries.ts';

const byIso = (iso) => COUNTRIES.find((c) => c.iso === iso);

test('lista de países', () => {
  assert.ok(COUNTRIES.length > 200);
  assert.equal(new Set(COUNTRIES.map((c) => c.iso)).size, COUNTRIES.length);
  assert.ok(COUNTRIES.every((c) => /^[A-Z]{2}$/.test(c.iso) && /^\d{1,3}$/.test(c.dial)));
  assert.equal(DEFAULT_COUNTRY.iso, 'CO');
  assert.equal(flagOf('CO'), '🇨🇴');
});

test('buscador', () => {
  assert.equal(searchCountries('espana')[0].iso, 'ES');
  assert.ok(searchCountries('+1').some((c) => c.iso === 'US'));
  assert.ok(searchCountries('japon').some((c) => c.iso === 'JP'));
  assert.equal(searchCountries('zzzz').length, 0);
});

test('E.164', () => {
  assert.equal(toE164(DEFAULT_COUNTRY, '300 123 4567'), '+573001234567');
  assert.equal(toE164(DEFAULT_COUNTRY, '30012345'), null);
  assert.equal(toE164(byIso('ES'), '612345678'), '+34612345678');
  assert.equal(toE164(byIso('US'), '(305) 555-0101'), '+13055550101');
  assert.equal(toE164(byIso('GB'), '07911123456'), '+447911123456');
  assert.equal(toE164(byIso('IT'), '0612345678'), '+390612345678');
  assert.equal(toE164(byIso('ES'), '12'), null);
});
