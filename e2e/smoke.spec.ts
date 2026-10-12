import { expect, test } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Enfield Story Forge');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('finished story');
  await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible();
});

test('protected pages send signed-out visitors to sign in', async ({ page }) => {
  await page.goto('/hub');
  await expect(page).toHaveURL(/\/sign-in\?redirect=/);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});

test('anyone can open the create-account form from the landing page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Create a free account' }).click();
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
});
