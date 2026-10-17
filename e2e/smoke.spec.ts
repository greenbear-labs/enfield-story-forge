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

test('Shadow Paths has its own landing page and sign-in', async ({ page }) => {
  await page.goto('/shadow-paths');
  await expect(page).toHaveTitle('Enfield Shadow Paths');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Shadow Paths');
  await page.getByRole('link', { name: 'Begin your journey' }).click();
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  await expect(page.getByText('Welcome, traveler.')).toBeVisible();
});

test('signed-out visitors to Shadow Paths sign in there', async ({ page }) => {
  await page.goto('/paths');
  await expect(page).toHaveURL(/\/shadow-paths\/sign-in\?redirect=/);
});

test('World Creator has its own landing page and sign-in', async ({ page }) => {
  await page.goto('/world-creator');
  await expect(page).toHaveTitle('Enfield World Creator');
  await page.getByRole('link', { name: 'Start your first world' }).click();
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  await expect(page.getByText('Welcome to the World Creator.')).toBeVisible();
});

test('signed-out visitors to World Creator sign in there', async ({ page }) => {
  await page.goto('/world');
  await expect(page).toHaveURL(/\/world-creator\/sign-in\?redirect=/);
});
