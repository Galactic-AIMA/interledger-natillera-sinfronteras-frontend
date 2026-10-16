/** Abrevia una dirección de billetera: "https://ilp.interledger-test.dev/rosa" → "…/rosa". */
export function shortAddress(address: string): string {
  const last = address.trim().replace(/\/+$/, '').split('/').pop();
  return last ? `…/${last}` : address;
}
