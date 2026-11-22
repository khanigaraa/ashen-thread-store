import { describe, expect, it } from 'vitest';
import { emptyBuyer, isBuyerValid, validateBuyer, type Buyer } from './buyer';
import { COUNTRIES, ZONES, availableMethods, quoteShipping, zoneForCountry } from './shipping';
import { createShop } from './shop';
import { memoryStorage } from './storage';
import type { Product } from './types';

const validBuyer: Buyer = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1 555 123 4567',
  address: '12 Main Street',
  city: 'Portland',
  region: 'OR',
  postalCode: '97201',
  country: 'US',
};

describe('shipping zones', () => {
  it('maps countries to zones', () => {
    expect(zoneForCountry('ID').id).toBe('domestic');
    expect(zoneForCountry('MY').id).toBe('z1');
    expect(zoneForCountry('JP').id).toBe('z2');
    expect(zoneForCountry('AU').id).toBe('z2');
    expect(zoneForCountry('US').id).toBe('z3');
    expect(zoneForCountry('DE').id).toBe('z3');
    expect(zoneForCountry('AE').id).toBe('z4');
  });

  it('every listed country is unique', () => {
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length);
  });

  it.each([
    // country, method, items, expected cents
    ['ID', 'standard', 1, 300],
    ['ID', 'standard', 3, 300],
    ['SG', 'standard', 1, 800],
    ['SG', 'standard', 3, 1400],
    ['SG', 'express', 2, 3100],
    ['JP', 'standard', 2, 1600],
    ['JP', 'express', 1, 3500],
    ['US', 'standard', 1, 1500],
    ['US', 'standard', 4, 3000],
    ['GB', 'express', 3, 6500],
    ['AE', 'standard', 2, 2400],
    ['ZA', 'express', 1, 5500],
  ] as const)('%s %s × %i = %i cents', (country, method, items, cents) => {
    const q = quoteShipping(country, method, items);
    expect(q.ok && q.cents).toBe(cents);
  });

  it('express is not offered for domestic shipping', () => {
    expect(availableMethods('ID')).toEqual(['standard']);
    expect(quoteShipping('ID', 'express', 1)).toEqual({ ok: false, reason: 'method_unavailable' });
    expect(availableMethods('US')).toEqual(['standard', 'express']);
  });

  it('rejects unknown countries and empty carts', () => {
    expect(quoteShipping('XX', 'standard', 1)).toEqual({ ok: false, reason: 'unknown_country' });
    expect(quoteShipping('US', 'standard', 0)).toEqual({ ok: false, reason: 'empty_cart' });
  });

  it('includes delivery estimates', () => {
    const q = quoteShipping('US', 'express', 1);
    expect(q.ok && q.days).toEqual([4, 7]);
    for (const zone of ZONES) expect(zone.rates.standard).toBeDefined();
  });
});

describe('buyer validation', () => {
  it('accepts complete details (region optional)', () => {
    expect(validateBuyer(validBuyer)).toEqual({});
    expect(isBuyerValid({ ...validBuyer, region: '' })).toBe(true);
  });

  it('flags every missing required field', () => {
    const errors = validateBuyer(emptyBuyer());
    expect(errors).toEqual({
      name: 'required',
      email: 'required',
      phone: 'required',
      address: 'required',
      city: 'required',
      postalCode: 'required',
      country: 'required',
    });
  });

  it('treats whitespace-only as missing', () => {
    expect(validateBuyer({ ...validBuyer, name: '   ' }).name).toBe('required');
  });

  it('checks email, phone and country format', () => {
    expect(validateBuyer({ ...validBuyer, email: 'jane@' }).email).toBe('invalid_email');
    expect(validateBuyer({ ...validBuyer, email: 'jane example.com' }).email).toBe('invalid_email');
    expect(validateBuyer({ ...validBuyer, phone: '123' }).phone).toBe('invalid_phone');
    expect(validateBuyer({ ...validBuyer, phone: 'call me' }).phone).toBe('invalid_phone');
    expect(validateBuyer({ ...validBuyer, phone: '0812-3456-7890' }).phone).toBeUndefined();
    expect(validateBuyer({ ...validBuyer, country: 'XX' }).country).toBe('invalid_country');
  });

  it('limits field length', () => {
    expect(validateBuyer({ ...validBuyer, city: 'x'.repeat(101) }).city).toBe('too_long');
  });
});

describe('checkout summary', () => {
  const tee: Product = {
    id: 'tee',
    slug: 'tee',
    name: { en: 'Tee', id: 'Kaos' },
    description: { en: '', id: '' },
    category: 'tee',
    designType: 'original',
    priceCents: 2800,
    weightGrams: 220,
    photos: [],
    stock: { S: 5, M: 5, L: 5, XL: 5, XXL: 5 },
    hidden: false,
  };

  it('adds shipping for the cart item count to the subtotal', () => {
    const shop = createShop(memoryStorage(), [tee], 1);
    shop.addToCart('tee', 'M', 2);
    shop.addToCart('tee', 'L', 1);
    const s = shop.checkoutSummary('US', 'standard');
    expect(s.itemCount).toBe(3);
    expect(s.subtotalCents).toBe(8400);
    expect(s.shipping.ok && s.shipping.cents).toBe(2500); // 1500 + 2 × 500
    expect(s.totalCents).toBe(10900);
  });

  it('has no total until a country is chosen', () => {
    const shop = createShop(memoryStorage(), [tee], 1);
    shop.addToCart('tee', 'M');
    expect(shop.checkoutSummary('', 'standard').totalCents).toBeUndefined();
  });

  it('remembers the checkout draft', () => {
    const storage = memoryStorage();
    createShop(storage, [tee], 1).saveCheckoutDraft({ buyer: validBuyer, method: 'express' });
    const draft = createShop(storage, [tee], 1).getCheckoutDraft();
    expect(draft).toEqual({ buyer: validBuyer, method: 'express' });
  });
});
