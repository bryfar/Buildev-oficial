import { test, expect } from '@playwright/test';

test.describe('editor smoke', () => {
  test('loads editor route', async ({ page }) => {
    const res = await page.goto('/editor', { waitUntil: 'domcontentloaded' });
    expect(res?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/Buildev/i);
  });
});
