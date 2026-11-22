import { DEMO_ADMIN } from '../../core/admin';
import { formatUSD } from '../../core/money';
import { ORDER_STATUSES, ORDER_TRANSITIONS, type Order, type OrderStatus } from '../../core/orders';
import type { Shop } from '../../core/shop';
import { adminOrderEmail, buyerOrderEmail, type EmailPreview } from '../emails';
import { setFlash } from '../flash';
import { esc } from '../html';
import { getLang, loc, t, type MessageKey } from '../i18n';
import { go } from '../navigate';
import type { View } from '../view';

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames([getLang()], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(getLang() === 'id' ? 'id-ID' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function statusBadge(status: OrderStatus): string {
  return `<span class="status status-${status}">${t(`status.${status}`)}</span>`;
}

export function isOrderStatus(value: string | null): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

/* ---------- Login ---------- */

export function adminLoginView(shop: Shop): View {
  const html = `
    <section class="section narrow admin-login">
      <h1 class="page-title">${t('admin.login')}</h1>
      <form class="login-form" novalidate>
        <div class="field">
          <label for="a-email">${t('admin.email')}</label>
          <input id="a-email" name="email" type="email" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="a-password">${t('admin.password')}</label>
          <input id="a-password" name="password" type="password" autocomplete="current-password" required />
        </div>
        <p class="form-err" data-login-err aria-live="polite"></p>
        <button type="submit" class="btn btn-block">${t('admin.signIn')}</button>
      </form>
      <div class="demo-creds">
        <p>${t('admin.demoCreds', { email: `<code>${DEMO_ADMIN.email}</code>`, password: `<code>${DEMO_ADMIN.password}</code>` })}</p>
        <p class="muted small">${t('admin.demoWarning')}</p>
      </div>
    </section>`;

  const mount = (root: HTMLElement) => {
    const form = root.querySelector<HTMLFormElement>('.login-form')!;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      if (shop.adminLogin(String(data.get('email') ?? ''), String(data.get('password') ?? ''))) {
        // Stay on the admin page that asked for the login (dashboard by default).
        go(location.hash || '#/admin');
      } else {
        root.querySelector('[data-login-err]')!.textContent = t('admin.loginFailed');
      }
    });
  };

  return { html, mount };
}

/* ---------- Order list ---------- */

export function adminOrdersView(shop: Shop, status?: OrderStatus): View {
  const all = shop.listOrders();
  const orders = status ? all.filter((o) => o.status === status) : all;
  const count = (s?: OrderStatus) => (s ? all.filter((o) => o.status === s).length : all.length);

  const chip = (href: string, label: string, n: number, on: boolean) =>
    `<a class="chip${on ? ' is-on' : ''}" href="${href}"${on ? ' aria-current="page"' : ''}>${label} <span class="chip-n">${n}</span></a>`;

  const rows = orders
    .map(
      (o) => `
      <tr>
        <td><a href="#/admin/orders/${encodeURIComponent(o.number)}">${esc(o.number)}</a></td>
        <td>${formatDate(o.createdAt)}</td>
        <td>${esc(o.buyer.name)}</td>
        <td>${esc(countryName(o.buyer.country))}</td>
        <td class="num">${formatUSD(o.totalCents)}</td>
        <td>${statusBadge(o.status)}</td>
      </tr>`,
    )
    .join('');

  return {
    html: `
      <section class="section admin">
        <h1 class="page-title">${t('admin.orders')}</h1>
        <nav class="filters" aria-label="${t('admin.col.status')}">
          ${chip('#/admin/orders', t('admin.allStatuses'), count(), !status)}
          ${ORDER_STATUSES.map((s) => chip(`#/admin/orders?status=${s}`, t(`status.${s}`), count(s), status === s)).join('')}
        </nav>
        ${
          orders.length
            ? `<div class="table-wrap"><table class="admin-table">
                <thead><tr>
                  <th>${t('admin.col.number')}</th><th>${t('admin.col.date')}</th><th>${t('admin.col.customer')}</th>
                  <th>${t('admin.col.country')}</th><th class="num">${t('admin.col.total')}</th><th>${t('admin.col.status')}</th>
                </tr></thead>
                <tbody>${rows}</tbody>
              </table></div>`
            : `<p class="muted">${t('admin.noOrders')}</p>`
        }
      </section>`,
  };
}

/* ---------- Dashboard ---------- */

export function adminDashboardView(shop: Shop): View {
  const s = shop.dashboardSummary();
  const latest = shop.listOrders().slice(0, 5);

  const stat = (label: string, value: string, href: string, note = '') => `
    <a class="stat" href="${href}">
      <span class="stat-label">${label}</span>
      <span class="stat-value">${value}</span>
      ${note ? `<span class="stat-note">${note}</span>` : ''}
    </a>`;

  // One line per product: sold-out sizes in red, low sizes in amber with the count left.
  const byProduct = new Map<string, { name: string; chips: string[] }>();
  for (const a of [...s.soldOut, ...s.lowStock]) {
    const entry = byProduct.get(a.product.id) ?? { name: loc(a.product.name), chips: [] };
    entry.chips.push(
      a.level === 'out'
        ? `<span class="alert-chip stock-zero" title="${t('admin.soldOutSizes')}">${a.size} · 0</span>`
        : `<span class="alert-chip stock-low" title="${t('admin.lowSizes')}">${a.size} · ${a.quantity}</span>`,
    );
    byProduct.set(a.product.id, entry);
  }
  const alertList = [...byProduct.entries()]
    .map(
      ([id, e]) => `
      <li>
        <a href="#/admin/products/${encodeURIComponent(id)}">${esc(e.name)}</a>
        <span class="alert-chips">${e.chips.join('')}</span>
      </li>`,
    )
    .join('');

  const html = `
    <section class="section admin">
      <h1 class="page-title">${t('admin.dashboard')}</h1>
      <div class="stats">
        ${stat(t('admin.statNew'), String(s.newOrders), '#/admin/orders?status=baru')}
        ${stat(t('admin.statToShip'), String(s.toShip), '#/admin/orders?status=dikemas')}
        ${stat(t('admin.statSales'), formatUSD(s.salesCents), '#/admin/orders', t('admin.statSalesNote', { n: s.orderCount }))}
      </div>

      <div class="admin-grid">
        <div class="admin-card">
          <div class="card-head">
            <h2 class="block-title">${t('admin.latestOrders')}</h2>
            <a class="small" href="#/admin/orders">${t('admin.viewAll')} →</a>
          </div>
          ${
            latest.length
              ? `<ul class="latest">${latest
                  .map(
                    (o) => `
                <li>
                  <a href="#/admin/orders/${encodeURIComponent(o.number)}">${esc(o.number)}</a>
                  <span class="muted">${esc(o.buyer.name)}</span>
                  <span>${formatUSD(o.totalCents)}</span>
                  ${statusBadge(o.status)}
                </li>`,
                  )
                  .join('')}</ul>`
              : `<p class="muted small">${t('admin.noOrders')}</p>`
          }
        </div>

        <div class="admin-card">
          <h2 class="block-title">${t('admin.stockAlerts')}</h2>
          ${
            s.soldOut.length + s.lowStock.length === 0
              ? `<p class="muted small">${t('admin.noAlerts')}</p>`
              : `<p class="alert-legend small">
                   <span class="stock-zero">■</span> ${t('admin.soldOutSizes')}
                   <span class="stock-low">■</span> ${t('admin.lowSizes')}
                 </p>
                 <ul class="alerts">${alertList}</ul>`
          }
        </div>

        <div class="admin-card">
          <h2 class="block-title">${t('admin.resetDemo')}</h2>
          <p class="muted small">${t('admin.resetHint')}</p>
          <button type="button" class="btn btn-ghost btn-danger" data-reset>${t('admin.resetDemo')}</button>
        </div>

        <div class="admin-card">
          <span class="soon-badge">${t('admin.whatsappSoon')}</span>
        </div>
      </div>
    </section>`;

  const mount = (root: HTMLElement) => {
    root.querySelector('[data-reset]')?.addEventListener('click', () => {
      if (!window.confirm(t('admin.resetConfirm'))) return;
      shop.resetDemo();
      window.dispatchEvent(new CustomEvent('cart:change'));
      setFlash('admin.resetDone');
      go('#/admin');
    });
  };

  return { html, mount };
}

/* ---------- Email previews ---------- */

function emailCard(label: string, mail: EmailPreview): string {
  return `
    <details class="email-preview">
      <summary>${label}</summary>
      <div class="email">
        <p class="email-meta"><span>${t('email.to')}:</span> ${esc(mail.to)}</p>
        <p class="email-meta"><span>${t('email.subject')}:</span> <strong>${esc(mail.subject)}</strong></p>
        <pre class="email-body">${esc(mail.lines.join('\n'))}</pre>
      </div>
    </details>`;
}

function notifications(order: Order): string {
  return `
    <div class="admin-card notify-card">
      <h2 class="block-title">${t('admin.emailPreviews')}</h2>
      ${emailCard(t('admin.emailToAdmin'), adminOrderEmail(order, getLang()))}
      ${emailCard(t('admin.emailToBuyer', { lang: order.lang.toUpperCase() }), buyerOrderEmail(order))}
      <p class="muted small">${t('admin.emailNotSent')}</p>
      <span class="soon-badge">${t('admin.whatsappSoon')}</span>
    </div>`;
}

/* ---------- Order detail ---------- */

const ACTION_LABEL: Partial<Record<OrderStatus, MessageKey>> = {
  dikemas: 'admin.markPacked',
  dikirim: 'admin.markShipped',
  selesai: 'admin.markCompleted',
  dibatalkan: 'admin.cancel',
};

function actions(order: Order): string {
  const next = ORDER_TRANSITIONS[order.status];
  if (next.length === 0) return `<p class="muted small">${t('admin.noActions')}</p>`;
  const forward = next.filter((s) => s !== 'dibatalkan');
  const canCancel = next.includes('dibatalkan');
  return `
    ${
      forward.includes('dikirim')
        ? `<div class="field">
            <label for="a-tracking">${t('admin.tracking')}</label>
            <input id="a-tracking" name="tracking" autocomplete="off" placeholder="RR123456789ID" />
          </div>`
        : ''
    }
    <div class="action-row">
      ${forward
        .map((s) => `<button type="button" class="btn" data-to="${s}">${t(ACTION_LABEL[s]!)}</button>`)
        .join('')}
      ${canCancel ? `<button type="button" class="btn btn-ghost btn-danger" data-to="dibatalkan">${t('admin.cancel')}</button>` : ''}
    </div>
    <p class="form-err" data-action-err aria-live="polite"></p>`;
}

export function adminOrderView(shop: Shop, number: string): View {
  const order = shop.getOrder(number);
  if (!order) {
    return {
      html: `
        <section class="section narrow">
          <p class="muted">${t('order.notFound')}</p>
          <a class="back" href="#/admin/orders">← ${t('admin.backToOrders')}</a>
        </section>`,
    };
  }
  const b = order.buyer;
  const items = order.items
    .map(
      (i) => `
      <tr>
        <td>${esc(loc(i.name))}</td>
        <td>${i.size}</td>
        <td class="num">${i.quantity}</td>
        <td class="num">${formatUSD(i.unitPriceCents)}</td>
        <td class="num">${formatUSD(i.lineTotalCents)}</td>
      </tr>`,
    )
    .join('');

  const html = `
    <section class="section admin">
      <a class="back" href="#/admin/orders">← ${t('admin.backToOrders')}</a>
      <div class="order-head">
        <h1 class="page-title">${esc(order.number)}</h1>
        ${statusBadge(order.status)}
      </div>
      <p class="muted small">${t('admin.placed', { date: formatDate(order.createdAt) })}</p>

      <div class="admin-grid">
        <div class="admin-card">
          <h2 class="block-title">${t('admin.items')}</h2>
          <div class="table-wrap"><table class="admin-table">
            <thead><tr><th></th><th>${t('chart.size')}</th><th class="num">${t('cart.quantity')}</th><th class="num"></th><th class="num">${t('checkout.total')}</th></tr></thead>
            <tbody>${items}</tbody>
          </table></div>
          <div class="summary-row"><span>${t('cart.subtotal')}</span><span>${formatUSD(order.subtotalCents)}</span></div>
          <div class="summary-row"><span>${t('checkout.shipping')}</span><span>${formatUSD(order.shippingCents)}</span></div>
          <div class="summary-row total"><span>${t('checkout.total')}</span><strong>${formatUSD(order.totalCents)}</strong></div>
        </div>

        <div class="admin-card">
          <h2 class="block-title">${t('admin.actions')}</h2>
          ${actions(order)}
        </div>

        <div class="admin-card">
          <h2 class="block-title">${t('admin.customer')}</h2>
          <p>${esc(b.name)}<br />
            <a href="mailto:${esc(b.email)}">${esc(b.email)}</a><br />
            ${esc(b.phone)}</p>
          <p>${[b.address, [b.city, b.region, b.postalCode].filter(Boolean).join(', '), countryName(b.country)]
            .map(esc)
            .join('<br />')}</p>
        </div>

        <div class="admin-card">
          <h2 class="block-title">${t('admin.shipping')}</h2>
          <p>${t(`method.${order.shippingMethod}`)} · ${t('checkout.days', { min: order.shippingDays[0], max: order.shippingDays[1] })}</p>
          ${
            order.trackingNumber
              ? `<p><span class="review-label">${t('admin.tracking')}</span><br /><code data-tracking>${esc(order.trackingNumber)}</code></p>`
              : ''
          }
          <h2 class="block-title">${t('admin.payment')}</h2>
          <p>${t(order.paymentMethod === 'paypal' ? 'order.payPaypal' : 'order.payCard')}</p>
        </div>

        ${notifications(order)}
      </div>
    </section>`;

  const mount = (root: HTMLElement) => {
    const err = root.querySelector<HTMLElement>('[data-action-err]');
    root.querySelectorAll<HTMLButtonElement>('[data-to]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const to = btn.dataset.to as OrderStatus;
        if (to === 'dibatalkan' && !window.confirm(t('admin.cancelConfirm', { number: order.number }))) return;
        const trackingNumber = root.querySelector<HTMLInputElement>('#a-tracking')?.value;
        const result = shop.updateOrderStatus(order.number, to, { trackingNumber });
        if (result.ok) {
          setFlash('admin.updated');
          go(location.hash);
        } else if (err) {
          err.textContent = result.reason === 'tracking_required' ? t('admin.trackingRequired') : result.reason;
          if (result.reason === 'tracking_required') root.querySelector<HTMLInputElement>('#a-tracking')?.focus();
        }
      }),
    );
  };

  return { html, mount };
}
