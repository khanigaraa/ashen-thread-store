import { describe, expect, it } from 'vitest';
import { ZONES } from '../core/shipping';
import { shippingExample, shippingRows } from './views/info';

describe('shipping info page', () => {
  it('has one row per shipping zone, read from the checkout rates', () => {
    const rows = shippingRows('en');
    expect(rows).toHaveLength(ZONES.length);
    expect(rows[0]).toEqual({
      zone: 'Indonesia',
      examples: '',
      standard: '$3.00 flat · 2–5 days',
      express: 'Not available',
    });
    expect(rows[3].zone).toBe('Americas & Europe');
    expect(rows[3].examples).toContain('United States');
    expect(rows[3].standard).toBe('$15.00 + $5.00 per extra item · 14–28 days');
    expect(rows[3].express).toBe('$45.00 + $10.00 per extra item · 4–7 days');
  });

  it('is translated to Indonesian', () => {
    const rows = shippingRows('id');
    expect(rows[1].zone).toBe('Asia Tenggara');
    expect(rows[0].express).toBe('Tidak tersedia');
    expect(rows[1].standard).toContain('per barang tambahan');
  });

  it('computes the worked example from the real rates', () => {
    expect(shippingExample('en')).toBe('Example: 2 tees to United States by Standard = $15.00 + $5.00 = $20.00.');
  });
});
