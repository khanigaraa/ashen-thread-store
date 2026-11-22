import { BUYER_FIELDS, isBuyerValid, validateBuyer, type Buyer, type BuyerField } from '../../core/buyer';
import { formatUSD } from '../../core/money';
import { COUNTRIES, availableMethods, quoteShipping, type ShippingMethod } from '../../core/shipping';
import type { Shop } from '../../core/shop';
import { esc } from '../html';
import { getLang, loc, t, type MessageKey } from '../i18n';
import type { View } from '../view';

const METHODS: ShippingMethod[] = ['standard', 'express'];

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames([getLang()], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function countryOptions(selected: string): string {
  const sorted = [...COUNTRIES].sort((a, b) => countryName(a).localeCompare(countryName(b), getLang()));
  return [
    `<option value="">${t('field.selectCountry')}</option>`,
    ...sorted.map(
      (c) => `<option value="${c}"${c === selected ? ' selected' : ''}>${esc(countryName(c))}</option>`,
    ),
  ].join('');
}

interface FieldSpec {
  name: BuyerField;
  type?: string;
  autocomplete: string;
  wide?: boolean;
}

function field(spec: FieldSpec, buyer: Buyer): string {
  const id = `f-${spec.name}`;
  const label = t(`field.${spec.name}` as MessageKey);
  const control =
    spec.name === 'country'
      ? `<select id="${id}" name="country" autocomplete="${spec.autocomplete}" aria-describedby="${id}-err">${countryOptions(buyer.country)}</select>`
      : `<input id="${id}" name="${spec.name}" type="${spec.type ?? 'text'}" autocomplete="${spec.autocomplete}"
          value="${esc(buyer[spec.name])}" aria-describedby="${id}-err" />`;
  return `
    <div class="field${spec.wide ? ' wide' : ''}" data-field="${spec.name}">
      <label for="${id}">${label}</label>
      ${control}
      <p class="field-err" id="${id}-err" aria-live="polite"></p>
    </div>`;
}

function methodOptions(country: string, method: ShippingMethod, itemCount: number): string {
  if (!country) return `<p class="muted small">${t('checkout.chooseCountry')}</p>`;
  const offered = availableMethods(country);
  return METHODS.map((m) => {
    const q = quoteShipping(country, m, itemCount);
    const enabled = offered.includes(m) && q.ok;
    const detail = q.ok
      ? `${formatUSD(q.cents)} · ${t('checkout.days', { min: q.days[0], max: q.days[1] })}`
      : t('checkout.expressUnavailable');
    return `
      <label class="method${enabled ? '' : ' is-disabled'}">
        <input type="radio" name="method" value="${m}"${m === method && enabled ? ' checked' : ''}${enabled ? '' : ' disabled'} />
        <span class="method-name">${t(`method.${m}`)}</span>
        <span class="method-detail muted small">${detail}</span>
      </label>`;
  }).join('');
}

function summary(shop: Shop, country: string, method: ShippingMethod): string {
  const s = shop.checkoutSummary(country, method);
  const lines = shop
    .cartLines()
    .map(
      (l) => `
      <li>
        <span>${esc(loc(l.product.name))}<br /><span class="muted small">${t('checkout.item', { size: l.size, qty: l.quantity })}</span></span>
        <span>${formatUSD(l.lineTotalCents)}</span>
      </li>`,
    )
    .join('');
  const ship = s.shipping.ok ? formatUSD(s.shipping.cents) : '—';
  const total = s.totalCents !== undefined ? formatUSD(s.totalCents) : '—';
  return `
    <h2 class="block-title">${t('checkout.summary')}</h2>
    <ul class="summary-lines">${lines}</ul>
    <a class="back small" href="#/cart">← ${t('checkout.editCart')}</a>
    <div class="summary-row"><span>${t('cart.subtotal')}</span><span>${formatUSD(s.subtotalCents)}</span></div>
    <div class="summary-row"><span>${t('checkout.shipping')}</span><span data-ship>${ship}</span></div>
    <div class="summary-row total"><span>${t('checkout.total')}</span><strong data-total>${total}</strong></div>
    <p class="duties small">${t('checkout.duties')}</p>`;
}

const ADDRESS_FIELDS: FieldSpec[] = [
  { name: 'name', autocomplete: 'name', wide: true },
  { name: 'address', autocomplete: 'street-address', wide: true },
  { name: 'city', autocomplete: 'address-level2' },
  { name: 'region', autocomplete: 'address-level1' },
  { name: 'postalCode', autocomplete: 'postal-code' },
  { name: 'country', autocomplete: 'country' },
];

export function checkoutView(shop: Shop): View {
  if (shop.cartCount() === 0) {
    return {
      html: `
        <section class="section narrow">
          <h1 class="page-title">${t('checkout.title')}</h1>
          <p class="muted">${t('cart.empty')}</p>
          <a class="btn" href="#/shop">${t('cart.continue')}</a>
        </section>`,
    };
  }
  if (shop.cartExceedsStock()) {
    return {
      html: `
        <section class="section narrow">
          <h1 class="page-title">${t('checkout.title')}</h1>
          <p class="stock-note">${t('checkout.stockIssue')}</p>
          <a class="btn" href="#/cart">${t('checkout.back')}</a>
        </section>`,
    };
  }

  const draft = shop.getCheckoutDraft();
  const buyer = draft.buyer;
  let method = draft.method;
  const itemCount = shop.cartCount();

  const html = `
    <section class="section checkout">
      <h1 class="page-title">${t('checkout.title')}</h1>
      <form class="checkout-grid" novalidate>
        <div class="checkout-form">
          <fieldset class="block">
            <legend class="block-title">${t('checkout.contact')}</legend>
            <div class="fields">
              ${field({ name: 'email', type: 'email', autocomplete: 'email' }, buyer)}
              ${field({ name: 'phone', type: 'tel', autocomplete: 'tel' }, buyer)}
            </div>
          </fieldset>
          <fieldset class="block">
            <legend class="block-title">${t('checkout.shippingAddress')}</legend>
            <div class="fields">${ADDRESS_FIELDS.map((f) => field(f, buyer)).join('')}</div>
          </fieldset>
          <fieldset class="block">
            <legend class="block-title">${t('checkout.method')}</legend>
            <div class="methods" data-methods>${methodOptions(buyer.country, method, itemCount)}</div>
          </fieldset>
        </div>
        <aside class="checkout-summary">
          <div data-summary>${summary(shop, buyer.country, method)}</div>
          <p class="form-err" data-form-err aria-live="polite"></p>
          <button type="submit" class="btn btn-block" data-continue>${t('checkout.continue')}</button>
        </aside>
      </form>
    </section>`;

  const mount = (root: HTMLElement) => {
    const form = root.querySelector<HTMLFormElement>('form')!;
    const continueBtn = root.querySelector<HTMLButtonElement>('[data-continue]')!;
    const formErr = root.querySelector<HTMLElement>('[data-form-err]')!;
    const touched = new Set<BuyerField>();

    const readBuyer = (): Buyer => {
      const data = new FormData(form);
      const b = { ...buyer };
      for (const f of BUYER_FIELDS) b[f] = String(data.get(f) ?? '');
      return b;
    };

    // Express may not exist for the chosen country: fall back to standard.
    const usableMethod = (country: string): ShippingMethod =>
      country && !availableMethods(country).includes(method) ? 'standard' : method;

    const showErrors = (b: Buyer, all: boolean) => {
      const errors = validateBuyer(b);
      for (const f of BUYER_FIELDS) {
        const wrap = root.querySelector<HTMLElement>(`[data-field="${f}"]`)!;
        const err = all || touched.has(f) ? errors[f] : undefined;
        wrap.classList.toggle('has-error', Boolean(err));
        wrap.querySelector('input, select')!.setAttribute('aria-invalid', String(Boolean(err)));
        wrap.querySelector('.field-err')!.textContent = err ? t(`err.${err}` as MessageKey) : '';
      }
    };

    const isReady = (b: Buyer) => isBuyerValid(b) && quoteShipping(b.country, method, itemCount).ok;

    const update = ({ redrawMethods = false } = {}) => {
      const b = readBuyer();
      method = usableMethod(b.country);
      shop.saveCheckoutDraft({ buyer: b, method });
      if (redrawMethods) {
        root.querySelector('[data-methods]')!.innerHTML = methodOptions(b.country, method, itemCount);
      }
      root.querySelector('[data-summary]')!.innerHTML = summary(shop, b.country, method);
      continueBtn.disabled = !isReady(b);
      if (!continueBtn.disabled) formErr.textContent = '';
      showErrors(b, false);
    };

    form.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.name === 'method') {
        method = target.value as ShippingMethod;
        update();
      } else if (target.name === 'country') {
        touched.add('country');
        update({ redrawMethods: true });
      } else {
        update();
      }
    });

    form.addEventListener(
      'blur',
      (e) => {
        const name = (e.target as HTMLInputElement).name as BuyerField;
        if ((BUYER_FIELDS as readonly string[]).includes(name)) {
          touched.add(name);
          showErrors(readBuyer(), false);
        }
      },
      true,
    );

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const b = readBuyer();
      if (!isReady(b)) {
        showErrors(b, true);
        formErr.textContent = t('checkout.fixErrors');
        root.querySelector<HTMLElement>('.has-error input, .has-error select')?.focus();
        return;
      }
      shop.saveCheckoutDraft({ buyer: b, method });
      location.hash = '#/payment';
    });

    // Initial state: button only enabled once the form is valid.
    continueBtn.disabled = !isReady(readBuyer());
  };

  return { html, mount };
}
