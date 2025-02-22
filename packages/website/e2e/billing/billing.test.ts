import { test, expect } from '@playwright/test'
import { AuthInfo } from '@mass-block-twitter/server'

let authInfo: AuthInfo
test.beforeEach(async ({ page }) => {
  authInfo = {
    id: '1',
    email: 'test@test.com',
    token: 'test-token',
    isPro: false,
  }
  await page.goto('/')
  await page.route('**/api/accounts/settings', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify(authInfo),
    })
  })
})

test('should disable upgrade button when user is pro', async ({ page }) => {
  authInfo.isPro = true
  await page.evaluate((authInfo) => {
    localStorage.setItem('authInfo', JSON.stringify(authInfo))
  }, authInfo)
  await page.reload()
  const upgradeButton = page.locator('[data-testid="upgrade-button"]')
  const title = await upgradeButton.textContent()
  expect(title).toBe('You are already a Pro user')
})

test('should show upgrade button when user is not pro', async ({ page }) => {
  await page.evaluate((authInfo) => {
    localStorage.setItem('authInfo', JSON.stringify(authInfo))
  }, authInfo)
  await page.reload()
  const upgradeButton = page.locator('[data-testid="upgrade-button"]')
  const title = await upgradeButton.textContent()
  expect(title).toBe('Upgrade to Pro')
})
