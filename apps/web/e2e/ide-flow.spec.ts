import { test, expect } from '@playwright/test';

test.describe('editor ide flow', () => {
  test('keeps editor route stable after reload', async ({ page }) => {
    const res = await page.goto('/editor', { waitUntil: 'domcontentloaded' });
    expect(res?.ok()).toBeTruthy();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/editor/);
    await expect(page).toHaveTitle(/Buildev/i);
  });
});

