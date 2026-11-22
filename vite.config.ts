import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the static build works from any folder or host.
  base: './',
  test: {
    include: ['src/**/*.test.ts'],
  },
});
