import { describe, expect, it } from 'vitest';
import { createShop } from './shop';
import { memoryStorage, type StorageAdapter } from './storage';
import type { Product } from './types';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'tee',
    slug: 'tee',
    name: { en: 'Tee', id: 'Kaos' },
    description: { en: '', id: '' },
    category: 'tee',
    designType: 'original',
    priceCents: 2800,
    weightGrams: 220,
    photos: [],
    stock: { S: 0, M: 2, L: 5, XL: 1, XXL: 0 },
    hidden: false,
    ...overrides,
  };
}

const jacket = product({ id: 'jacket', slug: 'jacket', category: 'jacket', priceCents: 18000 });

function setup(storage: StorageAdapter = memoryStorage()) {
  return createShop(storage, [product(), jacket], 1);
}

describe('cart', () => {
  it('starts empty', () => {
    const shop = setup();
    expect(shop.cartLines()).toEqual([]);
    expect(shop.cartCount()).toBe(0);
    expect(shop.cartSubtotalCents()).toBe(0);
  });

  it('merges the same product and size into one line', () => {
    const shop = setup();
    expect(shop.addToCart('tee', 'L')).toEqual({ ok: true });
    expect(shop.addToCart('tee', 'L', 2)).toEqual({ ok: true });
    shop.addToCart('tee', 'M');
    const lines = shop.cartLines();
    expect(lines.map((l) => [l.size, l.quantity])).toEqual([
      ['L', 3],
      ['M', 1],
    ]);
    expect(shop.cartCount()).toBe(4);
  });

  it('never goes above the stock of a size', () => {
    const shop = setup();
    expect(shop.addToCart('tee', 'S')).toEqual({ ok: false, reason: 'stock_limit' });
    expect(shop.addToCart('tee', 'M', 2)).toEqual({ ok: true });
    expect(shop.addToCart('tee', 'M')).toEqual({ ok: false, reason: 'stock_limit' });
    expect(shop.quantityInCart('tee', 'M')).toBe(2);
    expect(shop.setCartQuantity('tee', 'M', 3)).toEqual({ ok: false, reason: 'stock_limit' });
    expect(shop.quantityInCart('tee', 'M')).toBe(2);
  });

  it('rejects unknown or hidden products and bad quantities', () => {
    const storage = memoryStorage();
    const shop = createShop(storage, [product({ hidden: true })], 1);
    expect(shop.addToCart('tee', 'L')).toEqual({ ok: false, reason: 'unknown_product' });
    expect(shop.addToCart('nope', 'L')).toEqual({ ok: false, reason: 'unknown_product' });
    const shop2 = setup();
    expect(shop2.addToCart('tee', 'L', 0)).toEqual({ ok: false, reason: 'invalid_quantity' });
    expect(shop2.addToCart('tee', 'L', 1.5)).toEqual({ ok: false, reason: 'invalid_quantity' });
  });

  it('changes and removes lines', () => {
    const shop = setup();
    shop.addToCart('tee', 'L');
    shop.addToCart('jacket', 'XL');
    expect(shop.setCartQuantity('tee', 'L', 4)).toEqual({ ok: true });
    expect(shop.quantityInCart('tee', 'L')).toBe(4);
    expect(shop.setCartQuantity('tee', 'L', 0)).toEqual({ ok: true });
    expect(shop.quantityInCart('tee', 'L')).toBe(0);
    shop.removeFromCart('jacket', 'XL');
    expect(shop.cartCount()).toBe(0);
    expect(shop.setCartQuantity('tee', 'L', 1)).toEqual({ ok: false, reason: 'not_in_cart' });
  });

  it('computes the subtotal in cents', () => {
    const shop = setup();
    shop.addToCart('tee', 'L', 3); // 3 × 2800
    shop.addToCart('jacket', 'XL'); // 1 × 18000
    expect(shop.cartSubtotalCents()).toBe(26400);
    expect(shop.cartLines()[0].lineTotalCents).toBe(8400);
  });

  it('survives a reload (same storage, new shop instance)', () => {
    const storage = memoryStorage();
    setup(storage).addToCart('tee', 'L', 2);
    expect(setup(storage).quantityInCart('tee', 'L')).toBe(2);
  });

  it('drops lines whose product became hidden', () => {
    const storage = memoryStorage();
    setup(storage).addToCart('tee', 'L');
    const products = storage.get<Product[]>('products')!;
    storage.set('products', products.map((p) => (p.id === 'tee' ? { ...p, hidden: true } : p)));
    expect(setup(storage).cartLines()).toEqual([]);
  });

  it('clears the cart', () => {
    const shop = setup();
    shop.addToCart('tee', 'L');
    shop.clearCart();
    expect(shop.cartCount()).toBe(0);
  });
});
