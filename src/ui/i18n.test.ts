import { describe, expect, it } from 'vitest';
import { SEED_PRODUCTS } from '../core/seed';
import { memoryStorage } from '../core/storage';
import { MESSAGES, getLang, initLang, loc, setLang, t } from './i18n';

describe('i18n', () => {
  it('Indonesian has a non-empty translation for every English message', () => {
    for (const key of Object.keys(MESSAGES.en) as (keyof typeof MESSAGES.en)[]) {
      expect(MESSAGES.id[key], key).toBeTruthy();
    }
  });

  it('fills placeholders', () => {
    expect(t('product.onlyLeft', { n: 2, size: 'L' }, 'en')).toBe('Only 2 left in L');
    expect(t('product.onlyLeft', { n: 2, size: 'L' }, 'id')).toBe('Sisa 2 di ukuran L');
  });

  it('defaults to English and remembers the chosen language', () => {
    const storage = memoryStorage();
    expect(initLang(storage)).toBe('en');
    setLang('id');
    expect(getLang()).toBe('id');
    expect(initLang(storage)).toBe('id');
    setLang('en');
  });

  it('ignores an invalid saved language', () => {
    const storage = memoryStorage();
    storage.set('lang', 'fr');
    expect(initLang(storage)).toBe('en');
  });

  it('every sample product has English and Indonesian name and description', () => {
    for (const p of SEED_PRODUCTS) {
      expect(loc(p.name, 'id')).toBeTruthy();
      expect(loc(p.description, 'id')).toBeTruthy();
      expect(p.name.id).not.toBe('');
    }
  });

  it('falls back to English when a translation is empty', () => {
    expect(loc({ en: 'Tee', id: '' }, 'id')).toBe('Tee');
  });
});
