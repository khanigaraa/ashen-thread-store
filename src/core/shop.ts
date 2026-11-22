import { emptyBuyer, isBuyerValid, trimBuyer, type Buyer } from './buyer';
import { checkDemoLogin } from './admin';
import {
  FIRST_ORDER_SEQ,
  canTransition,
  formatOrderNumber,
  type Order,
  type OrderStatus,
  type PlaceOrderInput,
  type PlaceOrderResult,
  type StatusChangeResult,
} from './orders';
import {
  cleanProductInput,
  slugify,
  uniqueSlug,
  validateProduct,
  type ProductInput,
  type SaveProductResult,
} from './products';
import { SEED_PRODUCTS } from './seed';
import { quoteShipping, type ShippingMethod, type ShippingQuote } from './shipping';
import type { StorageAdapter } from './storage';
import { LOW_STOCK_THRESHOLD, SIZES, type Category, type Product, type Size } from './types';

const PRODUCTS_KEY = 'products';
const SEED_VERSION_KEY = 'seedVersion';
const CART_KEY = 'cart';
const CHECKOUT_KEY = 'checkoutDraft';
const ORDERS_KEY = 'orders';
const ORDER_SEQ_KEY = 'orderSeq';
const ADMIN_SESSION_KEY = 'adminSession';
const PRODUCT_SEQ_KEY = 'productSeq';

export interface CartItem {
  productId: string;
  size: Size;
  quantity: number;
}

export interface CartLine {
  product: Product;
  size: Size;
  quantity: number;
  /** Current stock of this size. */
  available: number;
  lineTotalCents: number;
}

export type CartError = 'unknown_product' | 'invalid_quantity' | 'stock_limit' | 'not_in_cart';
export type CartResult = { ok: true } | { ok: false; reason: CartError };

/**
 * Bump when the sample catalog changes, so browsers holding an older demo
 * catalog reload the new one.
 */
export const SEED_VERSION = 2;

export interface ListOptions {
  category?: Category;
}

export function isSoldOut(product: Product): boolean {
  return SIZES.every((size) => product.stock[size] <= 0);
}

export function isSizeAvailable(product: Product, size: Size): boolean {
  return product.stock[size] > 0;
}

/** A size is low when it is still in stock but at or below the threshold. */
export function isLowStock(product: Product, size: Size): boolean {
  const qty = product.stock[size];
  return qty > 0 && qty <= LOW_STOCK_THRESHOLD;
}

/** Sizes of a product that are in stock but running low. */
export function lowStockSizes(product: Product): Size[] {
  return SIZES.filter((size) => isLowStock(product, size));
}

/**
 * The shop core: all business rules live here, independent of the UI.
 * Seed data is loaded on first use when storage is empty.
 */
export function createShop(
  storage: StorageAdapter,
  seed: Product[] = SEED_PRODUCTS,
  seedVersion: number = SEED_VERSION,
) {
  /** Put the sample catalog back and clear cart, orders and checkout. Admin login and language stay. */
  const loadSeed = () => {
    storage.set(PRODUCTS_KEY, seed);
    storage.set(SEED_VERSION_KEY, seedVersion);
    storage.remove(CART_KEY);
    storage.remove(ORDERS_KEY);
    storage.remove(ORDER_SEQ_KEY);
    storage.remove(PRODUCT_SEQ_KEY);
    storage.remove(CHECKOUT_KEY);
  };

  if (
    storage.get<Product[]>(PRODUCTS_KEY) === undefined ||
    storage.get<number>(SEED_VERSION_KEY) !== seedVersion
  ) {
    loadSeed();
  }

  const allProducts = (): Product[] => storage.get<Product[]>(PRODUCTS_KEY) ?? [];
  const visibleById = (id: string) => allProducts().find((p) => p.id === id && !p.hidden);
  const readCart = (): CartItem[] => storage.get<CartItem[]>(CART_KEY) ?? [];
  const writeCart = (items: CartItem[]) => storage.set(CART_KEY, items);
  const readOrders = (): Order[] => storage.get<Order[]>(ORDERS_KEY) ?? [];
  const sameLine = (item: CartItem, productId: string, size: Size) =>
    item.productId === productId && item.size === size;

  /** Cart lines with their product, dropping products that no longer exist or are hidden. */
  const cartLines = (): CartLine[] =>
    readCart().flatMap((item) => {
      const product = visibleById(item.productId);
      if (!product) return [];
      return [
        {
          product,
          size: item.size,
          quantity: item.quantity,
          available: product.stock[item.size],
          lineTotalCents: product.priceCents * item.quantity,
        },
      ];
    });

  return {
    /** Public catalog: visible products only, optionally filtered by category. */
    listProducts(options: ListOptions = {}): Product[] {
      return allProducts().filter(
        (p) => !p.hidden && (options.category === undefined || p.category === options.category),
      );
    },

    /** A visible product by slug, or undefined. */
    getProduct(slug: string): Product | undefined {
      return allProducts().find((p) => p.slug === slug && !p.hidden);
    },

    /** Admin: every product, hidden ones included. */
    listAllProducts(): Product[] {
      return allProducts();
    },

    /** Admin: any product by id, hidden ones included. */
    getProductById(id: string): Product | undefined {
      return allProducts().find((p) => p.id === id);
    },

    /**
     * Admin: add a product (no id) or edit one (with id). The slug is made
     * from the English name when adding and stays the same on edits, so
     * shared links keep working.
     */
    saveProduct(input: ProductInput, id?: string): SaveProductResult {
      const clean = cleanProductInput(input);
      const errors = validateProduct(clean);
      if (Object.keys(errors).length > 0) return { ok: false, errors };

      const products = allProducts();
      if (id) {
        const existing = products.find((p) => p.id === id);
        if (!existing) return { ok: false, errors: { nameEn: 'required' } };
        const product: Product = { ...existing, ...clean };
        storage.set(PRODUCTS_KEY, products.map((p) => (p.id === id ? product : p)));
        return { ok: true, product };
      }

      const seq = storage.get<number>(PRODUCT_SEQ_KEY) ?? products.length + 1;
      const product: Product = {
        ...clean,
        id: `p${String(seq).padStart(2, '0')}-${Date.now().toString(36)}`,
        slug: uniqueSlug(slugify(clean.name.en), new Set(products.map((p) => p.slug))),
        hidden: false,
      };
      storage.set(PRODUCTS_KEY, [...products, product]);
      storage.set(PRODUCT_SEQ_KEY, seq + 1);
      return { ok: true, product };
    },

    /** Admin: hide a product from the store without deleting it, or show it again. */
    setProductHidden(id: string, hidden: boolean): boolean {
      const products = allProducts();
      if (!products.some((p) => p.id === id)) return false;
      storage.set(PRODUCTS_KEY, products.map((p) => (p.id === id ? { ...p, hidden } : p)));
      return true;
    },

    /** Quantity of one product + size already in the cart. */
    quantityInCart(productId: string, size: Size): number {
      return readCart().find((i) => sameLine(i, productId, size))?.quantity ?? 0;
    },

    /**
     * Add a product + size to the cart. The same product and size merge into
     * one line. The total quantity may never exceed the stock of that size.
     */
    addToCart(productId: string, size: Size, quantity = 1): CartResult {
      const product = visibleById(productId);
      if (!product) return { ok: false, reason: 'unknown_product' };
      if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, reason: 'invalid_quantity' };
      const items = readCart();
      const existing = items.find((i) => sameLine(i, productId, size));
      const next = (existing?.quantity ?? 0) + quantity;
      if (next > product.stock[size]) return { ok: false, reason: 'stock_limit' };
      if (existing) existing.quantity = next;
      else items.push({ productId, size, quantity });
      writeCart(items);
      return { ok: true };
    },

    /** Set the quantity of a cart line. Zero or less removes it. */
    setCartQuantity(productId: string, size: Size, quantity: number): CartResult {
      if (!Number.isInteger(quantity)) return { ok: false, reason: 'invalid_quantity' };
      const items = readCart();
      const existing = items.find((i) => sameLine(i, productId, size));
      if (!existing) return { ok: false, reason: 'not_in_cart' };
      if (quantity <= 0) {
        writeCart(items.filter((i) => i !== existing));
        return { ok: true };
      }
      const product = visibleById(productId);
      if (!product) return { ok: false, reason: 'unknown_product' };
      if (quantity > product.stock[size]) return { ok: false, reason: 'stock_limit' };
      existing.quantity = quantity;
      writeCart(items);
      return { ok: true };
    },

    removeFromCart(productId: string, size: Size): void {
      writeCart(readCart().filter((i) => !sameLine(i, productId, size)));
    },

    clearCart(): void {
      writeCart([]);
    },

    cartLines,

    /** Total number of items (sum of quantities). */
    cartCount(): number {
      return cartLines().reduce((sum, l) => sum + l.quantity, 0);
    },

    /** Sum of line totals in USD cents. */
    cartSubtotalCents(): number {
      return cartLines().reduce((sum, l) => sum + l.lineTotalCents, 0);
    },

    /** True when any cart line asks for more than the current stock. */
    cartExceedsStock(): boolean {
      return cartLines().some((l) => l.quantity > l.available);
    },

    /** Subtotal + shipping + total for the current cart, or why it can't be quoted. */
    checkoutSummary(country: string, method: ShippingMethod): CheckoutSummary {
      const lines = cartLines();
      const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
      const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
      const shipping = quoteShipping(country, method, itemCount);
      return {
        itemCount,
        subtotalCents,
        shipping,
        totalCents: shipping.ok ? subtotalCents + shipping.cents : undefined,
      };
    },

    /** The checkout form as last saved (survives reloads, used by payment). */
    getCheckoutDraft(): CheckoutDraft {
      const saved = storage.get<Partial<CheckoutDraft>>(CHECKOUT_KEY);
      return {
        buyer: { ...emptyBuyer(), ...(saved?.buyer ?? {}) },
        method: saved?.method === 'express' ? 'express' : 'standard',
      };
    },

    saveCheckoutDraft(draft: CheckoutDraft): void {
      storage.set(CHECKOUT_KEY, draft);
    },

    /**
     * Turn the cart into an order (after the simulated payment succeeds).
     * Stock is checked again and reduced in one step; on any problem nothing
     * changes. On success the cart is emptied.
     */
    placeOrder(input: PlaceOrderInput): PlaceOrderResult {
      const buyer = trimBuyer(input.buyer);
      if (!isBuyerValid(buyer)) return { ok: false, reason: 'invalid_buyer' };

      const cart = readCart();
      if (cart.length === 0) return { ok: false, reason: 'empty_cart' };

      const products = allProducts();
      const lines: { product: Product; item: CartItem }[] = [];
      for (const item of cart) {
        const product = products.find((p) => p.id === item.productId && !p.hidden);
        if (!product || item.quantity > product.stock[item.size]) return { ok: false, reason: 'stock_changed' };
        lines.push({ product, item });
      }

      const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
      const shipping = quoteShipping(buyer.country, input.shippingMethod, itemCount);
      if (!shipping.ok) return { ok: false, reason: 'shipping_unavailable' };

      const items = lines.map(({ product, item }) => ({
        productId: product.id,
        name: { ...product.name },
        size: item.size,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        lineTotalCents: product.priceCents * item.quantity,
      }));
      const subtotalCents = items.reduce((sum, i) => sum + i.lineTotalCents, 0);

      const seq = storage.get<number>(ORDER_SEQ_KEY) ?? FIRST_ORDER_SEQ;
      const order: Order = {
        number: formatOrderNumber(seq),
        createdAt: (input.now ?? new Date()).toISOString(),
        lang: input.lang,
        buyer,
        items,
        shippingMethod: shipping.method,
        shippingZone: shipping.zone,
        shippingDays: shipping.days,
        shippingCents: shipping.cents,
        subtotalCents,
        totalCents: subtotalCents + shipping.cents,
        paymentMethod: input.paymentMethod,
        status: 'baru',
      };

      // Reduce stock.
      const updated = products.map((p) => {
        const taken = cart.filter((i) => i.productId === p.id);
        if (taken.length === 0) return p;
        const stock = { ...p.stock };
        for (const i of taken) stock[i.size] -= i.quantity;
        return { ...p, stock };
      });

      storage.set(PRODUCTS_KEY, updated);
      storage.set(ORDERS_KEY, [...readOrders(), order]);
      storage.set(ORDER_SEQ_KEY, seq + 1);
      writeCart([]);
      return { ok: true, order };
    },

    /** All orders, newest first. */
    listOrders(): Order[] {
      return [...readOrders()].reverse();
    },

    getOrder(number: string): Order | undefined {
      return readOrders().find((o) => o.number === number);
    },

    /**
     * Move an order to its next status. Shipping needs a tracking number;
     * cancelling puts the items back in stock.
     */
    updateOrderStatus(number: string, to: OrderStatus, options: { trackingNumber?: string } = {}): StatusChangeResult {
      const orders = readOrders();
      const order = orders.find((o) => o.number === number);
      if (!order) return { ok: false, reason: 'not_found' };
      if (!canTransition(order.status, to)) return { ok: false, reason: 'invalid_transition' };

      const tracking = options.trackingNumber?.trim() ?? '';
      if (to === 'dikirim' && !tracking) return { ok: false, reason: 'tracking_required' };

      const updated: Order = { ...order, status: to, ...(to === 'dikirim' ? { trackingNumber: tracking } : {}) };

      if (to === 'dibatalkan') {
        const products = allProducts().map((p) => {
          const back = order.items.filter((i) => i.productId === p.id);
          if (back.length === 0) return p;
          const stock = { ...p.stock };
          for (const i of back) stock[i.size] += i.quantity;
          return { ...p, stock };
        });
        storage.set(PRODUCTS_KEY, products);
      }

      storage.set(
        ORDERS_KEY,
        orders.map((o) => (o.number === number ? updated : o)),
      );
      return { ok: true, order: updated };
    },

    /**
     * Admin dashboard numbers. Sales exclude cancelled orders. Stock alerts
     * cover products visible in the store.
     */
    dashboardSummary(): DashboardSummary {
      const orders = readOrders();
      const counted = orders.filter((o) => o.status !== 'dibatalkan');
      const alerts: StockAlert[] = [];
      for (const product of allProducts().filter((p) => !p.hidden)) {
        for (const size of SIZES) {
          const qty = product.stock[size];
          if (qty === 0) alerts.push({ product, size, quantity: 0, level: 'out' });
          else if (isLowStock(product, size)) alerts.push({ product, size, quantity: qty, level: 'low' });
        }
      }
      return {
        newOrders: orders.filter((o) => o.status === 'baru').length,
        toShip: orders.filter((o) => o.status === 'dikemas').length,
        orderCount: counted.length,
        salesCents: counted.reduce((sum, o) => sum + o.totalCents, 0),
        lowStock: alerts.filter((a) => a.level === 'low'),
        soldOut: alerts.filter((a) => a.level === 'out'),
      };
    },

    /** Admin: put the demo back to its starting state. */
    resetDemo(): void {
      loadSeed();
    },

    isAdminLoggedIn(): boolean {
      return storage.get<boolean>(ADMIN_SESSION_KEY) === true;
    },

    /** Demo login only; see core/admin. */
    adminLogin(email: string, password: string): boolean {
      const ok = checkDemoLogin(email, password);
      if (ok) storage.set(ADMIN_SESSION_KEY, true);
      return ok;
    },

    adminLogout(): void {
      storage.remove(ADMIN_SESSION_KEY);
    },
  };
}

export interface StockAlert {
  product: Product;
  size: Size;
  quantity: number;
  level: 'low' | 'out';
}

export interface DashboardSummary {
  /** Orders waiting to be packed. */
  newOrders: number;
  /** Packed orders waiting for a tracking number. */
  toShip: number;
  /** Orders that count as sales (not cancelled). */
  orderCount: number;
  salesCents: number;
  lowStock: StockAlert[];
  soldOut: StockAlert[];
}

export interface CheckoutDraft {
  buyer: Buyer;
  method: ShippingMethod;
}

export interface CheckoutSummary {
  itemCount: number;
  subtotalCents: number;
  shipping: ShippingQuote;
  /** Undefined until shipping can be quoted. */
  totalCents: number | undefined;
}

export type Shop = ReturnType<typeof createShop>;
