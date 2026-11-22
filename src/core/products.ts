import { CATEGORIES, SIZES, type Category, type DesignType, type LocalizedText, type Product, type Size } from './types';

/** What the admin form sends to add or edit a product. */
export interface ProductInput {
  name: LocalizedText;
  description: LocalizedText;
  category: Category;
  designType: DesignType;
  priceCents: number;
  weightGrams: number;
  photos: string[];
  stock: Record<Size, number>;
}

export type ProductField = 'nameEn' | 'nameId' | 'description' | 'category' | 'designType' | 'price' | 'weight' | 'stock';
export type ProductError =
  | 'required'
  | 'too_long'
  | 'invalid_price'
  | 'invalid_weight'
  | 'invalid_stock'
  | 'invalid_category'
  | 'invalid_design';
export type ProductErrors = Partial<Record<ProductField, ProductError>>;

export type SaveProductResult = { ok: true; product: Product } | { ok: false; errors: ProductErrors };

const DESIGN_TYPES: DesignType[] = ['original', 'collab'];
const MAX_PRICE_CENTS = 10_000_00; // $10,000 sanity cap

export function validateProduct(input: ProductInput): ProductErrors {
  const errors: ProductErrors = {};
  const nameEn = input.name.en.trim();
  if (!nameEn) errors.nameEn = 'required';
  else if (nameEn.length > 80) errors.nameEn = 'too_long';
  if (input.name.id.trim().length > 80) errors.nameId = 'too_long';
  if (input.description.en.length > 1000 || input.description.id.length > 1000) errors.description = 'too_long';
  if (!CATEGORIES.includes(input.category)) errors.category = 'invalid_category';
  if (!DESIGN_TYPES.includes(input.designType)) errors.designType = 'invalid_design';
  if (!Number.isInteger(input.priceCents) || input.priceCents <= 0 || input.priceCents > MAX_PRICE_CENTS) {
    errors.price = 'invalid_price';
  }
  if (!Number.isInteger(input.weightGrams) || input.weightGrams <= 0) errors.weight = 'invalid_weight';
  if (!SIZES.every((s) => Number.isInteger(input.stock[s]) && input.stock[s] >= 0)) errors.stock = 'invalid_stock';
  return errors;
}

/** "Cinder Sigil Long Sleeve!" -> "cinder-sigil-long-sleeve" */
export function slugify(text: string): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'product';
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Trim text fields; fall back to English when the Indonesian name is empty. */
export function cleanProductInput(input: ProductInput): ProductInput {
  const nameEn = input.name.en.trim();
  return {
    ...input,
    name: { en: nameEn, id: input.name.id.trim() || nameEn },
    description: { en: input.description.en.trim(), id: input.description.id.trim() },
    photos: input.photos.filter(Boolean),
    stock: { ...input.stock },
  };
}
