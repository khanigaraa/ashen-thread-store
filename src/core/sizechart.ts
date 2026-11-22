import type { Category, Size } from './types';

export interface SizeMeasure {
  /** Chest width, measured flat, in cm. */
  chestCm: number;
  /** Body length from shoulder, in cm. */
  lengthCm: number;
}

/** Example size charts per category. Adjust with real measurements from the client. */
export const SIZE_CHART: Record<Category, Record<Size, SizeMeasure>> = {
  tee: {
    S: { chestCm: 48, lengthCm: 68 },
    M: { chestCm: 51, lengthCm: 71 },
    L: { chestCm: 54, lengthCm: 74 },
    XL: { chestCm: 57, lengthCm: 77 },
    XXL: { chestCm: 60, lengthCm: 80 },
  },
  longsleeve: {
    S: { chestCm: 48, lengthCm: 69 },
    M: { chestCm: 51, lengthCm: 72 },
    L: { chestCm: 54, lengthCm: 75 },
    XL: { chestCm: 57, lengthCm: 78 },
    XXL: { chestCm: 60, lengthCm: 81 },
  },
  jacket: {
    S: { chestCm: 50, lengthCm: 62 },
    M: { chestCm: 53, lengthCm: 64 },
    L: { chestCm: 56, lengthCm: 66 },
    XL: { chestCm: 59, lengthCm: 68 },
    XXL: { chestCm: 62, lengthCm: 70 },
  },
};

/** Centimetres to inches, rounded to the nearest half inch. */
export function cmToInch(cm: number): number {
  return Math.round((cm / 2.54) * 2) / 2;
}
