import { createShop } from '../core/shop';
import { browserStorage } from '../core/storage';
import { CATEGORIES, type Category } from '../core/types';
import './styles.css';
import { takeFlash } from './flash';
import { esc } from './html';
import { LANGS, getLang, initLang, isLang, setLang, t } from './i18n';
import { go } from './navigate';
import type { View } from './view';
import {
  adminDashboardView,
  adminLoginView,
  adminOrderView,
  adminOrdersView,
  isOrderStatus,
} from './views/admin';
import { adminProductFormView, adminProductsView } from './views/adminProducts';
import { cartView } from './views/cart';
import { homeView, notFoundView, shopView } from './views/catalog';
import { checkoutView } from './views/checkout';
import { CONTACT, aboutView, contactView, exchangeView, shippingView } from './views/info';
import { orderSuccessView, paymentView } from './views/payment';
import { productView } from './views/product';

const storage = browserStorage();
const shop = createShop(storage);
initLang(storage);
const app = document.getElementById('app')!;

function langSwitch(): string {
  const current = getLang();
  return `
    <div class="lang" role="group" aria-label="${t('lang.switch')}">
      ${LANGS.map(
        (l) =>
          `<button type="button" data-lang="${l}" aria-pressed="${l === current}"${l === current ? ' class="is-on"' : ''}>${l.toUpperCase()}</button>`,
      ).join('')}
    </div>`;
}

function cartBadge(): string {
  const n = shop.cartCount();
  return n > 0 ? String(n) : '';
}

const navLink = (href: string, label: string, on: boolean) =>
  `<a href="${href}"${on ? ' class="is-on" aria-current="page"' : ''}>${label}</a>`;

function demoBanner(): string {
  return `<div class="demo-banner" role="note">${t('banner.demo')}</div>`;
}

function storeLayout(content: string, path: string): string {
  return `
    ${demoBanner()}
    <header class="header">
      <a class="logo" href="#/">ashen.thread</a>
      <div class="header-right">
        <nav class="nav" aria-label="${t('nav.main')}">
          ${navLink('#/', t('nav.home'), path === '/')}
          ${navLink('#/shop', t('nav.shop'), path.startsWith('/shop'))}
        </nav>
        ${langSwitch()}
        <a class="cart-link${path === '/cart' ? ' is-on' : ''}" href="#/cart" aria-label="${t('nav.cart')}">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor"
            stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" />
          </svg>
          <span class="cart-count" data-cart-count>${cartBadge()}</span>
        </a>
      </div>
    </header>
    <main>${content}</main>
    <footer class="footer">
      <div class="footer-brand">
        <span class="logo small">ashen.thread</span>
        <span>${t('footer.location')}</span>
      </div>
      <nav class="footer-links" aria-label="${t('footer.info')}">
        ${navLink('#/about', t('nav.about'), path === '/about')}
        ${navLink('#/shipping', t('nav.shipping'), path === '/shipping')}
        ${navLink('#/exchange', t('nav.exchange'), path === '/exchange')}
        ${navLink('#/contact', t('nav.contact'), path === '/contact')}
        <a href="${CONTACT.instagramUrl}" target="_blank" rel="noopener">Instagram</a>
      </nav>
    </footer>`;
}

function adminLayout(content: string, path: string, loggedIn: boolean): string {
  return `
    ${demoBanner()}
    <header class="header admin-header">
      <a class="logo" href="#/admin">ashen.thread <span class="admin-tag">${t('admin.title')}</span></a>
      <div class="header-right">
        ${
          loggedIn
            ? `<nav class="nav" aria-label="${t('admin.title')}">
                ${navLink('#/admin', t('admin.dashboard'), path === '/admin')}
                ${navLink('#/admin/orders', t('admin.orders'), path.startsWith('/admin/orders'))}
                ${navLink('#/admin/products', t('admin.products'), path.startsWith('/admin/products'))}
                ${navLink('#/', t('admin.viewStore'), false)}
              </nav>`
            : ''
        }
        ${langSwitch()}
        ${loggedIn ? `<button type="button" class="link-btn" data-logout>${t('admin.logout')}</button>` : ''}
      </div>
    </header>
    <main class="admin-main">${content}</main>`;
}

function adminRoute(path: string, params: URLSearchParams): View {
  if (!shop.isAdminLoggedIn()) return adminLoginView(shop);
  if (path === '/admin') return adminDashboardView(shop);
  if (path === '/admin/orders') {
    const status = params.get('status');
    return adminOrdersView(shop, isOrderStatus(status) ? status : undefined);
  }
  if (path.startsWith('/admin/orders/')) {
    return adminOrderView(shop, decodeURIComponent(path.slice('/admin/orders/'.length)));
  }
  if (path === '/admin/products') return adminProductsView(shop);
  if (path === '/admin/products/new') return adminProductFormView(shop);
  if (path.startsWith('/admin/products/')) {
    return adminProductFormView(shop, decodeURIComponent(path.slice('/admin/products/'.length)));
  }
  return { html: notFoundView() };
}

function storeRoute(path: string, params: URLSearchParams): View {
  if (path === '/') return { html: homeView(shop) };
  if (path === '/shop') {
    const cat = params.get('cat');
    const category = CATEGORIES.includes(cat as Category) ? (cat as Category) : undefined;
    return { html: shopView(shop, category) };
  }
  if (path === '/about') return { html: aboutView() };
  if (path === '/shipping') return { html: shippingView() };
  if (path === '/exchange') return { html: exchangeView() };
  if (path === '/contact') return { html: contactView() };
  if (path === '/cart') return cartView(shop);
  if (path === '/checkout') return checkoutView(shop);
  if (path === '/payment') return paymentView(shop);
  if (path.startsWith('/order/')) return orderSuccessView(shop, decodeURIComponent(path.slice('/order/'.length)));
  if (path.startsWith('/product/')) return productView(shop, decodeURIComponent(path.slice('/product/'.length)));
  return { html: notFoundView() };
}

/**
 * Hash routes.
 * Store: #/, #/shop, #/shop?cat=tee, #/product/<slug>, #/cart, #/checkout, #/payment, #/order/<number>,
 *        #/about, #/shipping, #/exchange, #/contact
 * Admin: #/admin, #/admin/orders, #/admin/orders?status=baru, #/admin/orders/<number>,
 *        #/admin/products, #/admin/products/new, #/admin/products/<id>
 */
function render({ keepScroll = false } = {}) {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = hash.split('?');
  const params = new URLSearchParams(query);
  const isAdmin = path === '/admin' || path.startsWith('/admin/');

  const view = isAdmin ? adminRoute(path, params) : storeRoute(path, params);

  const flash = takeFlash();
  const flashHtml = flash ? `<div class="flash" role="alert">${esc(t(flash))}</div>` : '';
  const content = flashHtml + view.html;

  document.documentElement.lang = getLang();
  document.body.classList.toggle('is-admin', isAdmin);
  const scrollY = window.scrollY;
  app.innerHTML = isAdmin ? adminLayout(content, path, shop.isAdminLoggedIn()) : storeLayout(content, path);
  view.mount?.(app);

  app.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (!isLang(lang) || lang === getLang()) return;
      setLang(lang);
      render({ keepScroll: true });
    });
  });

  app.querySelector('[data-logout]')?.addEventListener('click', () => {
    shop.adminLogout();
    go('#/admin');
  });

  window.scrollTo(0, keepScroll ? scrollY : 0);
}

window.addEventListener('hashchange', () => render());

// Cart changed: redraw the cart page, or just refresh the header badge elsewhere.
window.addEventListener('cart:change', () => {
  if (location.hash.startsWith('#/cart')) {
    render({ keepScroll: true });
  } else {
    const badge = app.querySelector('[data-cart-count]');
    if (badge) badge.textContent = cartBadge();
  }
});

render();
