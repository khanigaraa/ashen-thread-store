/**
 * Shipping zones and example rates. All rates live here so the checkout and
 * the Shipping info page read from one place. Values are examples for the demo.
 */

export type ShippingMethod = 'standard' | 'express';
export type ZoneId = 'domestic' | 'z1' | 'z2' | 'z3' | 'z4';

export interface Rate {
  /** Price for the first item, in USD cents. */
  firstCents: number;
  /** Price for each additional item, in USD cents. */
  additionalCents: number;
  /** Estimated delivery time in days. */
  days: [number, number];
}

export interface Zone {
  id: ZoneId;
  /** Example countries, for the Shipping info page. */
  examples: string[];
  rates: Partial<Record<ShippingMethod, Rate>>;
}

export const ZONES: Zone[] = [
  {
    id: 'domestic',
    examples: ['ID'],
    rates: { standard: { firstCents: 300, additionalCents: 0, days: [2, 5] } },
  },
  {
    id: 'z1',
    examples: ['MY', 'SG', 'TH', 'PH'],
    rates: {
      standard: { firstCents: 800, additionalCents: 300, days: [7, 14] },
      express: { firstCents: 2500, additionalCents: 600, days: [3, 5] },
    },
  },
  {
    id: 'z2',
    examples: ['JP', 'KR', 'AU'],
    rates: {
      standard: { firstCents: 1200, additionalCents: 400, days: [10, 21] },
      express: { firstCents: 3500, additionalCents: 800, days: [3, 6] },
    },
  },
  {
    id: 'z3',
    examples: ['US', 'CA', 'GB', 'DE'],
    rates: {
      standard: { firstCents: 1500, additionalCents: 500, days: [14, 28] },
      express: { firstCents: 4500, additionalCents: 1000, days: [4, 7] },
    },
  },
  {
    id: 'z4',
    examples: [],
    rates: {
      standard: { firstCents: 1800, additionalCents: 600, days: [14, 35] },
      express: { firstCents: 5500, additionalCents: 1200, days: [5, 10] },
    },
  },
];

const ZONE_COUNTRIES: Record<Exclude<ZoneId, 'z4'>, string[]> = {
  domestic: ['ID'],
  // Southeast Asia
  z1: ['MY', 'SG', 'TH', 'PH', 'VN', 'BN', 'KH', 'LA', 'MM', 'TL'],
  // Rest of Asia & Oceania
  z2: ['JP', 'KR', 'CN', 'HK', 'TW', 'MO', 'IN', 'PK', 'BD', 'LK', 'NP', 'MN', 'AU', 'NZ', 'FJ', 'PG'],
  // Americas & Europe
  z3: [
    'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'UY', 'EC', 'CR', 'PA', 'PR',
    'GB', 'IE', 'FR', 'DE', 'NL', 'BE', 'LU', 'ES', 'PT', 'IT', 'AT', 'CH', 'SE', 'NO', 'DK',
    'FI', 'IS', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR', 'HR', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY',
    'RS', 'UA',
  ],
};

/** Countries offered in the checkout list. Anything outside zones 1–3 and domestic is zone 4. */
export const COUNTRIES: string[] = [
  ...ZONE_COUNTRIES.domestic,
  ...ZONE_COUNTRIES.z1,
  ...ZONE_COUNTRIES.z2,
  ...ZONE_COUNTRIES.z3,
  // Zone 4: Middle East, Africa, others
  'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO', 'TR', 'IL', 'EG', 'MA', 'TN', 'ZA', 'NG', 'KE', 'GH',
  'KZ', 'UZ', 'GE', 'AM',
];

export function isKnownCountry(code: string): boolean {
  return COUNTRIES.includes(code);
}

export function zoneForCountry(code: string): Zone {
  const id =
    (Object.keys(ZONE_COUNTRIES) as (keyof typeof ZONE_COUNTRIES)[]).find((z) =>
      ZONE_COUNTRIES[z].includes(code),
    ) ?? 'z4';
  return ZONES.find((z) => z.id === id)!;
}

export function availableMethods(countryCode: string): ShippingMethod[] {
  const zone = zoneForCountry(countryCode);
  return (['standard', 'express'] as const).filter((m) => zone.rates[m] !== undefined);
}

export type ShippingQuote =
  | { ok: true; zone: ZoneId; method: ShippingMethod; cents: number; days: [number, number] }
  | { ok: false; reason: 'unknown_country' | 'method_unavailable' | 'empty_cart' };

/** Shipping cost: first item rate + additional rate for each extra item. */
export function quoteShipping(countryCode: string, method: ShippingMethod, itemCount: number): ShippingQuote {
  if (!isKnownCountry(countryCode)) return { ok: false, reason: 'unknown_country' };
  if (itemCount < 1) return { ok: false, reason: 'empty_cart' };
  const zone = zoneForCountry(countryCode);
  const rate = zone.rates[method];
  if (!rate) return { ok: false, reason: 'method_unavailable' };
  return {
    ok: true,
    zone: zone.id,
    method,
    cents: rate.firstCents + rate.additionalCents * (itemCount - 1),
    days: rate.days,
  };
}
