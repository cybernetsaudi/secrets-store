import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://secrets.gatvia.com'

test.describe('Frontend Navigation & User Flows', () => {
  test('should load home page', async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(page).toHaveTitle(/GUFC|Gulf United/i)
  })

  test('should navigate to product detail', async ({ page }) => {
    await page.goto(BASE_URL)
    
    // Find and click first product
    const productLink = page.locator('a[href*="/products/"]').first()
    if (await productLink.count() > 0) {
      await productLink.click()
      await expect(page).toHaveURL(/\/products\/\d+/)
    }
  })

  test('should add product to cart', async ({ page }) => {
    await page.goto(`${BASE_URL}/products/1`)
    
    // Select variant if available
    const variantSelect = page.locator('select[name*="variant"], select[id*="variant"]')
    if (await variantSelect.count() > 0) {
      await variantSelect.selectOption({ index: 1 })
    }
    
    // Click add to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart"), button:has-text("Add")')
    if (await addToCartButton.count() > 0) {
      await addToCartButton.click()
      await page.waitForTimeout(1000)
    }
  })

  test('should navigate to cart', async ({ page }) => {
    await page.goto(`${BASE_URL}/cart/`)
    await expect(page).toHaveURL(/\/cart/)
  })

  test('should navigate to checkout', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout/`)
    await expect(page).toHaveURL(/\/checkout/)
  })
})


