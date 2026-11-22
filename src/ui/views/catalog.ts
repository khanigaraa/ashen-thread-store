import { formatUSD } from '../../core/money';
import { isSoldOut, type Shop } from '../../core/shop';
import { CATEGORIES, type Category, type Product } from '../../core/types';
import { esc } from '../html';
import { loc, t } from '../i18n';
import { photo } from '../photo';

export function categoryLabel(category: Category): string {
  return t(`cat.${category}`);
}

function card(p: Product): string {
  const soldOut = isSoldOut(p);
  const name = loc(p.name);
  return `
    <a class="card${soldOut ? ' is-soldout' : ''}" href="#/product/${esc(p.slug)}">
      ${photo(p.photos[0], name)}
      ${soldOut ? `<span class="badge-soldout">${t('badge.soldout')}</span>` : ''}
      <div class="card-info">
        <span class="card-name">${esc(name)}</span>
        <span class="card-price">${formatUSD(p.priceCents)}</span>
      </div>
    </a>`;
}

function filters(active: Category | undefined): string {
  const chip = (href: string, label: string, on: boolean) =>
    `<a class="chip${on ? ' is-on' : ''}" href="${href}"${on ? ' aria-current="page"' : ''}>${label}</a>`;
  return `
    <nav class="filters" aria-label="${t('shop.filters')}">
      ${chip('#/shop', t('shop.all'), active === undefined)}
      ${CATEGORIES.map((c) => chip(`#/shop?cat=${c}`, categoryLabel(c), active === c)).join('')}
    </nav>`;
}

export function grid(shop: Shop, category?: Category): string {
  const products = shop.listProducts({ category });
  return `
    ${filters(category)}
    ${
      products.length
        ? `<div class="grid">${products.map(card).join('')}</div>`
        : `<p class="empty">${t('shop.empty')}</p>`
    }`;
}

export function homeView(shop: Shop): string {
  return `
    <section class="hero">
      <h1 class="logo-big">ashen.thread</h1>
      <p class="tagline">${esc(t('hero.tagline'))}</p>
      <a class="btn" href="#/shop">${t('hero.cta')}</a>
    </section>
    <section class="section">
      ${grid(shop)}
    </section>`;
}

export function shopView(shop: Shop, category?: Category): string {
  const title = category ? categoryLabel(category) : t('shop.allTitle');
  return `
    <section class="section">
      <h1 class="page-title">${title}</h1>
      ${grid(shop, category)}
    </section>`;
}

export function notFoundView(): string {
  return `
    <section class="section narrow">
      <h1 class="page-title">${t('notfound.title')}</h1>
      <p class="muted">${t('notfound.body')}</p>
      <a class="btn" href="#/">${t('notfound.cta')}</a>
    </section>`;
}
