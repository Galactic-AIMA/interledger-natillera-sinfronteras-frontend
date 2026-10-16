import type { Amount } from '@/api/types';

// Símbolo o sufijo como en los bocetos: "$50.000", "11,00 €", "24,88 US$".
const CURRENCY_STYLE: Record<string, { prefix?: string; suffix?: string }> = {
  COP: { prefix: '$' },
  MXN: { prefix: 'MX$' },
  USD: { suffix: ' US$' },
  EUR: { suffix: ' €' },
  GBP: { suffix: ' £' },
};

const CURRENCY_NAME: Record<string, string> = {
  COP: 'pesos',
  MXN: 'pesos mexicanos',
  USD: 'dólares',
  EUR: 'euros',
  GBP: 'libras',
};

// Divide el entero en unidades menores sin pasar por float: "5000000", 2 -> ["50000", "00"].
function splitMinor(value: string, scale: number): [string, string] {
  const digits = value.replace(/^-/, '').padStart(scale + 1, '0');
  const integer = scale > 0 ? digits.slice(0, -scale) : digits;
  const fraction = scale > 0 ? digits.slice(-scale) : '';
  return [integer.replace(/^0+(?=\d)/, ''), fraction];
}

function groupThousands(integer: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Formatea un monto de Open Payments para mostrarlo. Pesos sin decimales; el resto con 2. */
export function formatAmount(amount: Amount, options: { signed?: boolean } = {}): string {
  const negative = amount.value.startsWith('-');
  const [integer, fraction] = splitMinor(amount.value, amount.assetScale);
  const showDecimals = amount.assetCode !== 'COP' && fraction.length > 0;
  const number = groupThousands(integer) + (showDecimals ? `,${fraction.slice(0, 2).padEnd(2, '0')}` : '');
  const style = CURRENCY_STYLE[amount.assetCode] ?? { suffix: ` ${amount.assetCode}` };
  const sign = negative ? '−' : options.signed ? '+' : '';
  return `${sign}${style.prefix ?? ''}${number}${style.suffix ?? ''}`;
}

/** Convierte lo que escribe la persona ("50.000", "11,5") a unidades menores en string. */
export function toMinorUnits(input: string, assetScale: number, assetCode: string): string | null {
  const cleaned = input.trim().replace(/[^\d.,]/g, '');
  if (!cleaned) return null;
  // En pesos el punto separa miles; en otras monedas la coma (o el punto final) separa decimales.
  let integer = cleaned;
  let fraction = '';
  if (assetCode === 'COP') {
    integer = cleaned.replace(/[.,]/g, '');
  } else {
    const match = cleaned.match(/^(.*?)[.,](\d{1,2})$/);
    if (match) {
      integer = match[1] ?? '';
      fraction = match[2] ?? '';
    }
    integer = integer.replace(/[.,]/g, '');
  }
  const minor = `${integer || '0'}${fraction.padEnd(assetScale, '0').slice(0, assetScale)}`.replace(/^0+(?=\d)/, '');
  return /^\d+$/.test(minor) && minor !== '0' ? minor : null;
}

export function currencyName(assetCode: string): string {
  return CURRENCY_NAME[assetCode] ?? assetCode;
}

export function amount(value: string, assetCode: string, assetScale = 2): Amount {
  return { value, assetCode, assetScale };
}
