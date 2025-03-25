import { FeedbackRequest } from '@mass-block-twitter/server'
import { test, expect } from '@playwright/test'
import { omit } from 'es-toolkit'

let req: FeedbackRequest | undefined = undefined
test.beforeEach(async ({ page }) => {
  await page.route('**/api/feedback/submit', async (route) => {
    req = (await route.request().postDataJSON()) as FeedbackRequest
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ code: 'success' }),
    })
  })
})

test('feedback form', async ({ page }) => {
  await page.goto('/feedback')
  await expect(page.getByText('Submit Feedback')).toBeVisible()
})

test('submit feedback', async ({ page }) => {
  await page.goto('/feedback')
  await page.getByText('Submit Feedback').click()
  expect(req).not.toBeUndefined()
  expect(omit(req!, ['context'])).toEqual({
    reason: 'missing',
    suggestion: '',
    email: '',
  })
  await expect(page.getByText('Thank You for Your Feedback!')).toHaveCount(2)
  await page.reload()
  await expect(page.getByText('Thank You for Your Feedback!')).toHaveCount(1)
})

test('submit feedback with all fields', async ({ page }) => {
  await page.goto('/feedback')
  await page.getByRole('textbox', { name: 'suggestion' }).fill('test')
  await page.getByRole('textbox', { name: 'email' }).fill('test@test.com')
  await page.getByLabel('Features not working properly').click()
  await page.getByText('Submit Feedback').click()
  await expect(page.getByText('Thank You for Your Feedback!')).toHaveCount(2)
  expect(req).not.toBeUndefined()
  expect(omit(req!, ['context'])).toEqual({
    reason: 'broken',
    suggestion: 'test',
    email: 'test@test.com',
  })
})
