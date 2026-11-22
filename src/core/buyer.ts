import { isKnownCountry } from './shipping';

export interface Buyer {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  /** State / province / region, optional. */
  region: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2 code, e.g. "US". */
  country: string;
}

export const BUYER_FIELDS = [
  'name',
  'email',
  'phone',
  'address',
  'city',
  'region',
  'postalCode',
  'country',
] as const satisfies readonly (keyof Buyer)[];

export type BuyerField = keyof Buyer;
export type BuyerError = 'required' | 'invalid_email' | 'invalid_phone' | 'too_long' | 'invalid_country';
export type BuyerErrors = Partial<Record<BuyerField, BuyerError>>;

export function emptyBuyer(): Buyer {
  return { name: '', email: '', phone: '', address: '', city: '', region: '', postalCode: '', country: '' };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Digits with optional leading +, spaces, dashes, dots, brackets. 6–15 digits. */
const PHONE_CHARS_RE = /^\+?[\d\s\-().]+$/;

/** Validate shipping details. Returns an empty object when everything is valid. */
export function validateBuyer(input: Buyer): BuyerErrors {
  const b = trimBuyer(input);
  const errors: BuyerErrors = {};
  const required: BuyerField[] = ['name', 'email', 'phone', 'address', 'city', 'postalCode', 'country'];
  for (const f of required) {
    if (!b[f]) errors[f] = 'required';
  }
  for (const f of BUYER_FIELDS) {
    if (!errors[f] && b[f].length > (f === 'address' ? 200 : 100)) errors[f] = 'too_long';
  }
  if (!errors.email && !EMAIL_RE.test(b.email)) errors.email = 'invalid_email';
  if (!errors.phone) {
    const digits = b.phone.replace(/\D/g, '').length;
    if (!PHONE_CHARS_RE.test(b.phone) || digits < 6 || digits > 15) errors.phone = 'invalid_phone';
  }
  if (!errors.country && !isKnownCountry(b.country)) errors.country = 'invalid_country';
  return errors;
}

export function isBuyerValid(input: Buyer): boolean {
  return Object.keys(validateBuyer(input)).length === 0;
}

export function trimBuyer(input: Buyer): Buyer {
  const out = emptyBuyer();
  for (const f of BUYER_FIELDS) out[f] = (input[f] ?? '').trim();
  return out;
}
