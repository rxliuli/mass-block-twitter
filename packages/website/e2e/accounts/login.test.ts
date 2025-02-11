import { test, expect } from '@playwright/test'
import { AuthInfo } from '../../src/lib/components/auth/auth.svelte'

test.describe('login successfully', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          code: 'success',
          data: {
            id: '1',
            email: 'test@test.com',
            token: '1234567890',
            isPro: false,
          } satisfies AuthInfo,
        }),
      })
    })
  })

  test('normal user login', async ({ page }) => {
    await page.goto('/accounts/login')
    await page.locator('input[name="email"]').fill('test@test.com')
    await page.locator('input[name="password"]').fill('password')
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL('/')
    await expect(page.locator('[data-testid="profile-button"]')).toBeVisible()
  })

  test('auto redirect to previous page', async ({ page }) => {
    await page.goto('/accounts/login?redirect=/pricing')
    await page.locator('input[name="email"]').fill('test@test.com')
    await page.locator('input[name="password"]').fill('password')
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL('/pricing')
  })
})

test.describe('sign up', () => {
  test('sign up for first time success', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          code: 'verify-email',
        }),
      })
    })
    await page.route('**/verify-email', async (route, request) => {
      const body = await request.postDataJSON()
      expect(body).toEqual({
        email: 'test@test.com',
        code: '123456',
      })
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          code: 'success',
        }),
      })
    })
    await page.goto('/accounts/login')
    await page.locator('input[name="email"]').fill('test@test.com')
    await page.locator('input[name="password"]').fill('password')
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(
      '/accounts/email-verify?' +
        new URLSearchParams({
          email: 'test@test.com',
        }).toString(),
    )
    await page.locator('input[name="code"]').fill('123456')
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL('/')
  })
})
