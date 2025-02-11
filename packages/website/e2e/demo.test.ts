import { expect, test } from '@playwright/test'

test('home page has expected login button', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
})

test('login button redirects to login page', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-testid="login-button"]').click()
  await expect(page).toHaveURL('/accounts/login')
})
