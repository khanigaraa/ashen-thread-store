import { formatUSD } from '../../core/money';
import type { ProductField, ProductInput } from '../../core/products';
import { isLowStock, type Shop } from '../../core/shop';
import { CATEGORIES, SIZES, type Category, type DesignType, type Product } from '../../core/types';
import { setFlash } from '../flash';
import { esc } from '../html';
import { loc, t, type MessageKey } from '../i18n';
import { go } from '../navigate';
import { photo } from '../photo';
import type { View } from '../view';
import { categoryLabel } from './catalog';

/* ---------- Product list ---------- */

function stockCell(p: Product): string {
  return SIZES.map((s) => {
    const qty = p.stock[s];
    const cls = qty === 0 ? 'stock-zero' : isLowStock(p, s) ? 'stock-low' : '';
    return `<td class="num ${cls}">${qty}</td>`;
  }).join('');
}

export function adminProductsView(shop: Shop): View {
  const products = shop.listAllProducts();
  const rows = products
    .map((p) => {
      const name = loc(p.name);
      return `
      <tr class="${p.hidden ? 'is-hidden' : ''}">
        <td class="prod-cell">
          <span class="prod-thumb">${photo(p.photos[0], name)}</span>
          <a href="#/admin/products/${encodeURIComponent(p.id)}">${esc(name)}</a>
        </td>
        <td>${categoryLabel(p.category)}</td>
        <td class="num">${formatUSD(p.priceCents)}</td>
        ${stockCell(p)}
        <td>
          <span class="vis ${p.hidden ? 'vis-hidden' : 'vis-on'}">${t(p.hidden ? 'admin.hiddenLabel' : 'admin.visible')}</span>
        </td>
        <td class="row-actions">
          <button type="button" class="link-btn" data-toggle="${esc(p.id)}" data-hidden="${p.hidden}">
            ${t(p.hidden ? 'admin.show' : 'admin.hide')}</button>
          <a href="#/admin/products/${encodeURIComponent(p.id)}">${t('admin.edit')}</a>
        </td>
      </tr>`;
    })
    .join('');

  const html = `
    <section class="section admin">
      <div class="order-head spread">
        <h1 class="page-title">${t('admin.products')}</h1>
        <a class="btn" href="#/admin/products/new">+ ${t('admin.addProduct')}</a>
      </div>
      <div class="table-wrap"><table class="admin-table">
        <thead><tr>
          <th>${t('admin.col.product')}</th><th>${t('admin.col.category')}</th><th class="num">${t('admin.col.price')}</th>
          ${SIZES.map((s) => `<th class="num">${s}</th>`).join('')}
          <th>${t('admin.col.visibility')}</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </section>`;

  const mount = (root: HTMLElement) => {
    root.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const hide = btn.dataset.hidden !== 'true';
        shop.setProductHidden(btn.dataset.toggle!, hide);
        setFlash(hide ? 'admin.productHidden' : 'admin.productShown');
        go(location.hash);
      }),
    );
  };

  return { html, mount };
}

/* ---------- Product form ---------- */

/** Resize an uploaded image to a square-ish JPEG data URL so it fits in browser storage. */
async function imageToDataUrl(file: File, maxSize = 900): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82);
}

function fieldErr(name: ProductField): string {
  return `<p class="field-err" data-err="${name}" aria-live="polite"></p>`;
}

function photosHtml(photos: string[], label: string): string {
  return photos
    .map(
      (src, i) => `
      <div class="pf-photo">
        ${photo(src, label)}
        <button type="button" class="pf-photo-remove" data-remove-photo="${i}" aria-label="${t('pf.removePhoto')}">×</button>
      </div>`,
    )
    .join('');
}

export function adminProductFormView(shop: Shop, id?: string): View {
  const existing = id ? shop.getProductById(id) : undefined;
  if (id && !existing) {
    return {
      html: `
        <section class="section narrow">
          <p class="muted">${t('notfound.body')}</p>
          <a class="back" href="#/admin/products">← ${t('admin.backToProducts')}</a>
        </section>`,
    };
  }

  const p: ProductInput = existing ?? {
    name: { en: '', id: '' },
    description: { en: '', id: '' },
    category: 'tee',
    designType: 'original',
    priceCents: 2800,
    weightGrams: 220,
    photos: [],
    stock: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
  };
  let photos = [...p.photos];
  const title = existing ? t('admin.editProduct') : t('admin.newProduct');
  const radio = (name: string, value: string, label: string, checked: boolean) =>
    `<label class="radio"><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''} /> ${label}</label>`;

  const html = `
    <section class="section admin">
      <a class="back" href="#/admin/products">← ${t('admin.backToProducts')}</a>
      <div class="order-head spread">
        <h1 class="page-title">${title}</h1>
        ${existing && !existing.hidden ? `<a class="small" href="#/product/${esc(existing.slug)}">${t('admin.viewInStore')} ↗</a>` : ''}
      </div>
      <form class="product-form" novalidate>
        <div class="admin-grid">
          <div class="admin-card">
            <div class="fields">
              <div class="field wide" data-field="nameEn">
                <label for="pf-name-en">${t('pf.nameEn')}</label>
                <input id="pf-name-en" name="nameEn" value="${esc(p.name.en)}" maxlength="80" />
                ${fieldErr('nameEn')}
              </div>
              <div class="field wide" data-field="nameId">
                <label for="pf-name-id">${t('pf.nameId')}</label>
                <input id="pf-name-id" name="nameId" value="${esc(p.name.id)}" maxlength="80" />
                ${fieldErr('nameId')}
              </div>
              <div class="field wide" data-field="description">
                <label for="pf-desc-en">${t('pf.descEn')}</label>
                <textarea id="pf-desc-en" name="descEn" rows="3" maxlength="1000">${esc(p.description.en)}</textarea>
              </div>
              <div class="field wide">
                <label for="pf-desc-id">${t('pf.descId')}</label>
                <textarea id="pf-desc-id" name="descId" rows="3" maxlength="1000">${esc(p.description.id)}</textarea>
                ${fieldErr('description')}
              </div>
              <div class="field" data-field="price">
                <label for="pf-price">${t('pf.price')}</label>
                <input id="pf-price" name="price" inputmode="decimal" value="${(p.priceCents / 100).toFixed(2)}" />
                ${fieldErr('price')}
              </div>
              <div class="field" data-field="weight">
                <label for="pf-weight">${t('pf.weight')}</label>
                <input id="pf-weight" name="weight" inputmode="numeric" value="${p.weightGrams}" />
                ${fieldErr('weight')}
              </div>
            </div>
          </div>

          <div class="admin-card">
            <fieldset class="block" data-field="category">
              <legend class="block-title">${t('pf.category')}</legend>
              <div class="radio-row">${CATEGORIES.map((c) => radio('category', c, categoryLabel(c), p.category === c)).join('')}</div>
              ${fieldErr('category')}
            </fieldset>
            <fieldset class="block" data-field="designType">
              <legend class="block-title">${t('pf.designType')}</legend>
              <div class="radio-row">
                ${radio('designType', 'original', t('design.original'), p.designType === 'original')}
                ${radio('designType', 'collab', t('design.collab'), p.designType === 'collab')}
              </div>
              ${fieldErr('designType')}
            </fieldset>
            <fieldset class="block" data-field="stock">
              <legend class="block-title">${t('pf.stock')}</legend>
              <div class="stock-grid">
                ${SIZES.map(
                  (s) => `
                  <label class="stock-input">
                    <span>${s}</span>
                    <input name="stock-${s}" inputmode="numeric" value="${p.stock[s]}" aria-label="${t('pf.stock')} ${s}" />
                  </label>`,
                ).join('')}
              </div>
              ${fieldErr('stock')}
            </fieldset>
            <fieldset class="block">
              <legend class="block-title">${t('pf.photos')}</legend>
              <div class="pf-photos" data-photos>${photosHtml(photos, p.name.en)}</div>
              <label class="btn btn-ghost pf-upload">
                ${t('pf.addPhoto')}
                <input type="file" accept="image/*" multiple data-photo-input hidden />
              </label>
              <p class="muted small">${t('pf.photoHint')}</p>
              <p class="field-err" data-photo-err aria-live="polite"></p>
            </fieldset>
          </div>
        </div>
        <p class="form-err" data-form-err aria-live="polite"></p>
        <button type="submit" class="btn">${t('pf.save')}</button>
      </form>
    </section>`;

  const mount = (root: HTMLElement) => {
    const form = root.querySelector<HTMLFormElement>('.product-form')!;
    const photosEl = root.querySelector<HTMLElement>('[data-photos]')!;
    const photoErr = root.querySelector<HTMLElement>('[data-photo-err]')!;

    const drawPhotos = () => {
      photosEl.innerHTML = photosHtml(photos, p.name.en);
      photosEl.querySelectorAll<HTMLButtonElement>('[data-remove-photo]').forEach((btn) =>
        btn.addEventListener('click', () => {
          photos = photos.filter((_, i) => i !== Number(btn.dataset.removePhoto));
          drawPhotos();
        }),
      );
    };
    drawPhotos();

    root.querySelector<HTMLInputElement>('[data-photo-input]')!.addEventListener('change', async (e) => {
      const input = e.target as HTMLInputElement;
      photoErr.textContent = '';
      for (const file of Array.from(input.files ?? [])) {
        try {
          photos.push(await imageToDataUrl(file));
        } catch {
          photoErr.textContent = t('pf.photoFailed');
        }
      }
      input.value = '';
      drawPhotos();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const str = (k: string) => String(d.get(k) ?? '');
      const num = (k: string) => (str(k).trim() === '' ? NaN : Number(str(k).replace(',', '.')));
      const input: ProductInput = {
        name: { en: str('nameEn'), id: str('nameId') },
        description: { en: str('descEn'), id: str('descId') },
        category: str('category') as Category,
        designType: str('designType') as DesignType,
        priceCents: Math.round(num('price') * 100),
        weightGrams: num('weight'),
        photos,
        stock: Object.fromEntries(SIZES.map((s) => [s, num(`stock-${s}`)])) as ProductInput['stock'],
      };

      const result = shop.saveProduct(input, existing?.id);
      root.querySelectorAll<HTMLElement>('[data-err]').forEach((el) => (el.textContent = ''));
      root.querySelectorAll('.has-error').forEach((el) => el.classList.remove('has-error'));

      if (result.ok) {
        setFlash('pf.saved');
        go('#/admin/products');
        return;
      }
      for (const [field, code] of Object.entries(result.errors)) {
        const msg = root.querySelector<HTMLElement>(`[data-err="${field}"]`);
        if (msg) msg.textContent = t(`perr.${code}` as MessageKey);
        root.querySelector(`[data-field="${field}"]`)?.classList.add('has-error');
      }
      root.querySelector('[data-form-err]')!.textContent = t('pf.fixErrors');
      root.querySelector<HTMLElement>('.has-error input, .has-error textarea')?.focus();
    });
  };

  return { html, mount };
}
