export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type Size = (typeof SIZES)[number];

export const CATEGORIES = ['tee', 'longsleeve', 'jacket'] as const;
export type Category = (typeof CATEGORIES)[number];

export type DesignType = 'original' | 'collab';

export interface LocalizedText {
  en: string;
  id: string;
}

export interface Product {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  category: Category;
  designType: DesignType;
  /** Price in USD cents. */
  priceCents: number;
  weightGrams: number;
  /** Photo paths relative to the site root, e.g. "foto/ashfall-tee-1.jpg". */
  photos: string[];
  stock: Record<Size, number>;
  hidden: boolean;
}

/** Stock at or below this number counts as "low". */
export const LOW_STOCK_THRESHOLD = 2;
