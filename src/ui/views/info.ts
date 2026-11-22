import { formatUSD } from '../../core/money';
import { ZONES, quoteShipping, type Rate, type Zone } from '../../core/shipping';
import { getLang, t, type Lang, type MessageKey } from '../i18n';

/** Example contact details for the demo. Replace with the client's real ones before going live. */
export const CONTACT = {
  instagramHandle: 'ashen.thread',
  // Brand fiktif: link sengaja tidak mengarah ke akun Instagram sungguhan.
  instagramUrl: '#',
  whatsapp: '+62 8xx-xxxx-xxxx',
  email: 'hello@ashenthread.test',
};

function countryName(code: string, lang: Lang): string {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function rateText(rate: Rate | undefined, lang: Lang): string {
  if (!rate) return t('ship.notAvailable', {}, lang);
  const price =
    rate.additionalCents === 0
      ? t('ship.flat', { first: formatUSD(rate.firstCents) }, lang)
      : t('ship.rate', { first: formatUSD(rate.firstCents), extra: formatUSD(rate.additionalCents) }, lang);
  return `${price} · ${t('checkout.days', { min: rate.days[0], max: rate.days[1] }, lang)}`;
}

export interface ShippingRow {
  zone: string;
  examples: string;
  standard: string;
  express: string;
}

/** Rows of the Shipping page table, read from the same rates the checkout uses. */
export function shippingRows(lang: Lang = getLang()): ShippingRow[] {
  return ZONES.map((z: Zone) => ({
    zone: t(`ship.zone.${z.id}` as MessageKey, {}, lang),
    examples:
      z.id === 'z4'
        ? t('ship.zone.z4Examples', {}, lang)
        : z.id === 'domestic'
          ? ''
          : z.examples.map((c) => countryName(c, lang)).join(', '),
    standard: rateText(z.rates.standard, lang),
    express: rateText(z.rates.express, lang),
  }));
}

/** "Example: 2 tees to the United States by Standard = $15 + $5 = $20", computed from the real rates. */
export function shippingExample(lang: Lang = getLang()): string {
  const one = quoteShipping('US', 'standard', 1);
  const two = quoteShipping('US', 'standard', 2);
  if (!one.ok || !two.ok) return '';
  return t(
    'ship.example',
    {
      country: countryName('US', lang),
      first: formatUSD(one.cents),
      extra: formatUSD(two.cents - one.cents),
      total: formatUSD(two.cents),
    },
    lang,
  );
}

function page(title: MessageKey, body: string): string {
  return `
    <section class="section narrow info">
      <h1 class="page-title">${t(title)}</h1>
      ${body}
    </section>`;
}

export function aboutView(): string {
  return page(
    'about.title',
    `
      <p class="info-lead">${t('about.lead')}</p>
      <p>${t('about.p1')}</p>
      <p>${t('about.p2')}</p>
      <p>${t('about.p3')}</p>
      <p class="info-mark" aria-hidden="true">Bandung · ID</p>
      <a class="btn" href="#/shop">${t('about.cta')}</a>`,
  );
}

export function shippingView(): string {
  const rows = shippingRows()
    .map(
      (r) => `
      <tr>
        <th scope="row">${r.zone}${r.examples ? `<span class="muted small">${r.examples}</span>` : ''}</th>
        <td data-label="${t('ship.colStandard')}">${r.standard}</td>
        <td data-label="${t('ship.colExpress')}">${r.express}</td>
      </tr>`,
    )
    .join('');
  return page(
    'ship.title',
    `
      <p class="info-lead">${t('ship.lead')}</p>
      <table class="ship-table">
        <thead><tr><th>${t('ship.colZone')}</th><th>${t('ship.colStandard')}</th><th>${t('ship.colExpress')}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="muted small">${shippingExample()}</p>
      <h2 class="block-title">${t('ship.processingTitle')}</h2>
      <p>${t('ship.processing')}</p>
      <h2 class="block-title">${t('ship.dutiesTitle')}</h2>
      <p class="duties">${t('ship.duties')}</p>`,
  );
}

export function exchangeView(): string {
  return page(
    'ex.title',
    `
      <p class="info-lead">${t('ex.lead')}</p>
      <ol class="rules">
        <li>${t('ex.rule1')}</li>
        <li>${t('ex.rule2')}</li>
        <li>${t('ex.rule3')}</li>
        <li>${t('ex.rule4')}</li>
      </ol>
      <h2 class="block-title">${t('ex.howTitle')}</h2>
      <p>${t('ex.how')}</p>
      <a class="btn btn-ghost" href="#/contact">${t('nav.contact')}</a>`,
  );
}

export function contactView(): string {
  return page(
    'contact.title',
    `
      <p class="info-lead">${t('contact.lead')}</p>
      <ul class="contact-list">
        <li>
          <span class="review-label">${t('contact.instagram')}</span>
          <a href="${CONTACT.instagramUrl}" target="_blank" rel="noopener">@${CONTACT.instagramHandle}</a>
        </li>
        <li>
          <span class="review-label">${t('contact.whatsapp')}</span>
          <span>${CONTACT.whatsapp} <span class="muted small">(${t('contact.example')})</span></span>
        </li>
        <li>
          <span class="review-label">${t('contact.email')}</span>
          <span>${CONTACT.email} <span class="muted small">(${t('contact.example')})</span></span>
        </li>
      </ul>
      <p class="muted small">${t('contact.orderTip')}</p>`,
  );
}
