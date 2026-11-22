import { describe, expect, it } from 'vitest';
import type { Buyer } from './buyer';
import type { PlaceOrderInput } from './orders';
import { createShop } from './shop';
import { memoryStorage, type StorageAdapter } from './storage';
import type { Product } from './types';

const buyer: Buyer = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1 555 123 4567',
  address: '12 Main Street',
  city: 'Portland',
  region: 'OR',
  postalCode: '97201',
  country: 'US',
};

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
  stock: { S: 0, M: 2, L: 5, XL: 1, XXL: 0 },
  hidden: false,
};

const jacket: Product = { ...tee, id: 'jacket', slug: 'jacket', category: 'jacket', priceCents: 18000 };

const input = (overrides: Partial<PlaceOrderInput> = {}): PlaceOrderInput => ({
  buyer,
  shippingMethod: 'standard',
  paymentMethod: 'paypal',
  lang: 'en',
  now: new Date('2026-11-19T10:00:00Z'),
  ...overrides,
});

function setup(storage: StorageAdapter = memoryStorage()) {
  return createShop(storage, [tee, jacket], 1);
}

describe('placing an order', () => {
  it('creates an order with copies of name, size and price, and status baru', () => {
    const shop = setup();
    shop.addToCart('tee', 'L', 2);
    shop.addToCart('jacket', 'XL', 1);
    const result = shop.placeOrder(input({ paymentMethod: 'card', lang: 'id' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const o = result.order;
    expect(o.number).toBe('AT-1001');
    expect(o.createdAt).toBe('2026-11-19T10:00:00.000Z');
    expect(o.status).toBe('baru');
    expect(o.paymentMethod).toBe('card');
    expect(o.lang).toBe('id');
    expect(o.items).toEqual([
      { productId: 'tee', name: { en: 'Tee', id: 'Kaos' }, size: 'L', quantity: 2, unitPriceCents: 2800, lineTotalCents: 5600 },
      { productId: 'jacket', name: { en: 'Tee', id: 'Kaos' }, size: 'XL', quantity: 1, unitPriceCents: 18000, lineTotalCents: 18000 },
    ]);
    expect(o.subtotalCents).toBe(23600);
    expect(o.shippingCents).toBe(2500); // US standard, 3 items
    expect(o.shippingZone).toBe('z3');
    expect(o.totalCents).toBe(26100);
  });

  it('reduces stock per size and empties the cart', () => {
    const storage = memoryStorage();
    const shop = setup(storage);
    shop.addToCart('tee', 'L', 2);
    shop.addToCart('tee', 'M', 2);
    shop.placeOrder(input());
    const after = setup(storage).getProduct('tee')!;
    expect(after.stock).toEqual({ S: 0, M: 0, L: 3, XL: 1, XXL: 0 });
    expect(shop.cartCount()).toBe(0);
  });

  it('numbers orders sequentially and lists newest first', () => {
    const shop = setup();
    shop.addToCart('tee', 'L');
    shop.placeOrder(input());
    shop.addToCart('tee', 'L');
    shop.placeOrder(input());
    expect(shop.listOrders().map((o) => o.number)).toEqual(['AT-1002', 'AT-1001']);
    expect(shop.getOrder('AT-1001')?.items[0].quantity).toBe(1);
  });

  it('rejects the order and changes nothing when stock ran out meanwhile', () => {
    const storage = memoryStorage();
    const shop = setup(storage);
    shop.addToCart('tee', 'M', 2);
    // Someone else bought one M in the meantime.
    const products = storage.get<Product[]>('products')!;
    storage.set(
      'products',
      products.map((p) => (p.id === 'tee' ? { ...p, stock: { ...p.stock, M: 1 } } : p)),
    );
    expect(shop.placeOrder(input())).toEqual({ ok: false, reason: 'stock_changed' });
    expect(setup(storage).getProduct('tee')!.stock.M).toBe(1);
    expect(shop.cartCount()).toBe(2);
    expect(shop.listOrders()).toEqual([]);
  });

  it('rejects an empty cart, invalid buyer and unavailable shipping', () => {
    const shop = setup();
    expect(shop.placeOrder(input())).toEqual({ ok: false, reason: 'empty_cart' });
    shop.addToCart('tee', 'L');
    expect(shop.placeOrder(input({ buyer: { ...buyer, email: 'nope' } }))).toEqual({
      ok: false,
      reason: 'invalid_buyer',
    });
    expect(shop.placeOrder(input({ buyer: { ...buyer, country: 'ID' }, shippingMethod: 'express' }))).toEqual({
      ok: false,
      reason: 'shipping_unavailable',
    });
    expect(shop.cartCount()).toBe(1);
  });

  it('keeps the order price even if the product price changes later', () => {
    const storage = memoryStorage();
    const shop = setup(storage);
    shop.addToCart('tee', 'L');
    const result = shop.placeOrder(input());
    const products = storage.get<Product[]>('products')!;
    storage.set('products', products.map((p) => ({ ...p, priceCents: 9900 })));
    expect(result.ok && shop.getOrder(result.order.number)?.items[0].unitPriceCents).toBe(2800);
  });
});
