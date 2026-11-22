import { describe, expect, it } from 'vitest';
import { formatUSD } from './money';
import { SEED_PRODUCTS } from './seed';
import { createShop, isLowStock, isSizeAvailable, isSoldOut, lowStockSizes } from './shop';
import { SIZE_CHART, cmToInch } from './sizechart';
import { memoryStorage } from './storage';
import { SIZES, type Product } from './types';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'x1',
    slug: 'test-tee',
    name: { en: 'Test Tee', id: 'Kaos Tes' },
    description: { en: '', id: '' },
    category: 'tee',
    designType: 'original',
    priceCents: 2800,
    weightGrams: 220,
    photos: [],
    stock: { S: 5, M: 5, L: 5, XL: 5, XXL: 5 },
    hidden: false,
    ...overrides,
  };
}

describe('catalog', () => {
  it('loads the sample catalog on first use: 5 tees, 2 long sleeves, 1 jacket', () => {
    const shop = createShop(memoryStorage());
    const all = shop.listProducts();
    expect(all).toHaveLength(8);
    expect(shop.listProducts({ category: 'tee' })).toHaveLength(5);
    expect(shop.listProducts({ category: 'longsleeve' })).toHaveLength(2);
    expect(shop.listProducts({ category: 'jacket' })).toHaveLength(1);
  });

  it('does not overwrite existing data when created again', () => {
    const storage = memoryStorage();
    createShop(storage, [product({ slug: 'only-one' })]);
    const shop = createShop(storage);
    expect(shop.listProducts().map((p) => p.slug)).toEqual(['only-one']);
  });

  it('filters by category', () => {
    const shop = createShop(memoryStorage(), [
      product({ slug: 'a', category: 'tee' }),
      product({ slug: 'b', category: 'jacket' }),
    ]);
    expect(shop.listProducts({ category: 'jacket' }).map((p) => p.slug)).toEqual(['b']);
  });

  it('hides hidden products from the catalog and from lookup', () => {
    const shop = createShop(memoryStorage(), [
      product({ slug: 'visible' }),
      product({ slug: 'secret', hidden: true }),
    ]);
    expect(shop.listProducts().map((p) => p.slug)).toEqual(['visible']);
    expect(shop.getProduct('secret')).toBeUndefined();
    expect(shop.getProduct('visible')?.slug).toBe('visible');
  });

  it('seed has at least one fully sold out product and some low stock sizes', () => {
    expect(SEED_PRODUCTS.some(isSoldOut)).toBe(true);
    expect(SEED_PRODUCTS.some((p) => lowStockSizes(p).length > 0)).toBe(true);
  });
});

describe('stock status', () => {
  it('is sold out only when every size is zero', () => {
    expect(isSoldOut(product({ stock: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 } }))).toBe(true);
    expect(isSoldOut(product({ stock: { S: 0, M: 0, L: 1, XL: 0, XXL: 0 } }))).toBe(false);
  });

  it('marks a size low at 1 or 2 left, but not at 0 or 3', () => {
    const p = product({ stock: { S: 0, M: 1, L: 2, XL: 3, XXL: 10 } });
    expect(isLowStock(p, 'S')).toBe(false);
    expect(isLowStock(p, 'M')).toBe(true);
    expect(isLowStock(p, 'L')).toBe(true);
    expect(isLowStock(p, 'XL')).toBe(false);
    expect(lowStockSizes(p)).toEqual(['M', 'L']);
  });
});

describe('size availability', () => {
  it('a size is available only with stock above zero', () => {
    const p = product({ stock: { S: 0, M: 1, L: 5, XL: 0, XXL: 2 } });
    expect(isSizeAvailable(p, 'S')).toBe(false);
    expect(isSizeAvailable(p, 'M')).toBe(true);
    expect(isSizeAvailable(p, 'L')).toBe(true);
    expect(isSizeAvailable(p, 'XL')).toBe(false);
  });

  it('every category has a size chart row for every size', () => {
    for (const category of ['tee', 'longsleeve', 'jacket'] as const) {
      for (const size of SIZES) {
        expect(SIZE_CHART[category][size].chestCm).toBeGreaterThan(0);
      }
    }
    expect(cmToInch(51)).toBe(20);
    expect(cmToInch(74)).toBe(29);
  });
});

describe('seed version', () => {
  it('reloads the sample catalog when the seed version changes', () => {
    const storage = memoryStorage();
    createShop(storage, [product({ slug: 'old' })], 1);
    const shop = createShop(storage, [product({ slug: 'new' })], 2);
    expect(shop.listProducts().map((p) => p.slug)).toEqual(['new']);
  });
});

describe('money', () => {
  it('formats cents as USD', () => {
    expect(formatUSD(2800)).toBe('$28.00');
    expect(formatUSD(18000)).toBe('$180.00');
  });
});
