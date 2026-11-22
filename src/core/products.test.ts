import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug, validateProduct, type ProductInput } from './products';
import { createShop, isSoldOut } from './shop';
import { memoryStorage } from './storage';
import type { Product } from './types';

const tee: Product = {
  id: 'tee',
  slug: 'ashfall-tee',
  name: { en: 'Ashfall Tee', id: 'Kaos Ashfall' },
  description: { en: '', id: '' },
  category: 'tee',
  designType: 'collab',
  priceCents: 2800,
  weightGrams: 220,
  photos: [],
  stock: { S: 1, M: 2, L: 3, XL: 0, XXL: 0 },
  hidden: false,
};

const input = (overrides: Partial<ProductInput> = {}): ProductInput => ({
  name: { en: 'Void Walker Hoodie', id: 'Hoodie Void Walker' },
  description: { en: 'Heavy fleece.', id: 'Fleece tebal.' },
  category: 'jacket',
  designType: 'original',
  priceCents: 5500,
  weightGrams: 700,
  photos: ['data:image/jpeg;base64,AAAA'],
  stock: { S: 1, M: 4, L: 4, XL: 2, XXL: 0 },
  ...overrides,
});

const setup = () => createShop(memoryStorage(), [tee], 1);

describe('adding products', () => {
  it('adds a product that shows up in the store under a slug made from its name', () => {
    const shop = setup();
    const result = shop.saveProduct(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.product.slug).toBe('void-walker-hoodie');
    expect(result.product.hidden).toBe(false);
    expect(shop.getProduct('void-walker-hoodie')?.priceCents).toBe(5500);
    expect(shop.listProducts({ category: 'jacket' }).map((p) => p.slug)).toEqual(['void-walker-hoodie']);
  });

  it('gives a unique slug when the name is already used', () => {
    const shop = setup();
    const result = shop.saveProduct(input({ name: { en: 'Ashfall Tee', id: '' } }));
    expect(result.ok && result.product.slug).toBe('ashfall-tee-2');
  });

  it('uses the English name when the Indonesian name is empty', () => {
    const shop = setup();
    const result = shop.saveProduct(input({ name: { en: '  Bone Tee ', id: '  ' } }));
    expect(result.ok && result.product.name).toEqual({ en: 'Bone Tee', id: 'Bone Tee' });
  });

  it('rejects invalid input and stores nothing', () => {
    const shop = setup();
    const result = shop.saveProduct(
      input({ name: { en: ' ', id: '' }, priceCents: 0, weightGrams: -1, stock: { S: 1, M: -2, L: 0, XL: 0, XXL: 0 } }),
    );
    expect(result).toEqual({
      ok: false,
      errors: { nameEn: 'required', price: 'invalid_price', weight: 'invalid_weight', stock: 'invalid_stock' },
    });
    expect(shop.listAllProducts()).toHaveLength(1);
  });
});

describe('editing products', () => {
  it('changes price, description and stock but keeps id and slug', () => {
    const shop = setup();
    const result = shop.saveProduct(
      input({ name: { en: 'Ashfall Tee (Reprint)', id: 'Kaos Ashfall (Cetak Ulang)' }, priceCents: 3200, category: 'tee' }),
      'tee',
    );
    expect(result.ok).toBe(true);
    const p = shop.getProduct('ashfall-tee')!;
    expect(p.id).toBe('tee');
    expect(p.priceCents).toBe(3200);
    expect(p.name.en).toBe('Ashfall Tee (Reprint)');
    expect(p.stock.M).toBe(4);
  });

  it('setting all stock to zero makes the product sold out in the store', () => {
    const shop = setup();
    shop.saveProduct({ ...tee, stock: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 } }, 'tee');
    expect(isSoldOut(shop.getProduct('ashfall-tee')!)).toBe(true);
  });

  it('does not create a product when editing an unknown id', () => {
    const shop = setup();
    expect(shop.saveProduct(input(), 'nope').ok).toBe(false);
    expect(shop.listAllProducts()).toHaveLength(1);
  });
});

describe('hiding products', () => {
  it('hides from the store but keeps it for admin, and can show it again', () => {
    const shop = setup();
    expect(shop.setProductHidden('tee', true)).toBe(true);
    expect(shop.listProducts()).toEqual([]);
    expect(shop.getProduct('ashfall-tee')).toBeUndefined();
    expect(shop.getProductById('tee')?.hidden).toBe(true);
    expect(shop.listAllProducts()).toHaveLength(1);
    shop.setProductHidden('tee', false);
    expect(shop.listProducts()).toHaveLength(1);
    expect(shop.setProductHidden('nope', true)).toBe(false);
  });
});

describe('product helpers', () => {
  it('slugifies names', () => {
    expect(slugify('Cinder Sigil Long Sleeve!')).toBe('cinder-sigil-long-sleeve');
    expect(slugify('  Café — Noir  ')).toBe('cafe-noir');
    expect(slugify('!!!')).toBe('product');
    expect(uniqueSlug('a', new Set(['a', 'a-2']))).toBe('a-3');
  });

  it('accepts a valid product and rejects bad category or design type', () => {
    expect(validateProduct(input())).toEqual({});
    expect(validateProduct(input({ category: 'hat' as never })).category).toBe('invalid_category');
    expect(validateProduct(input({ designType: 'bootleg' as never })).designType).toBe('invalid_design');
    expect(validateProduct(input({ priceCents: 28.5 })).price).toBe('invalid_price');
  });
});
