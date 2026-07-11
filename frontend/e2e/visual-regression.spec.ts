import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://secrets.gatvia.com'
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

test.describe('Visual Regression Tests', () => {
  test('home page visual snapshot', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('product detail page visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/products/1`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('product-detail.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('cart page visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/cart/`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('cart-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('checkout page visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/checkout/`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('checkout-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('admin login page visual snapshot', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login/`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('admin-login.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('admin products list visual snapshot', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/admin/login/`)
    await page.fill('input[name="username"]', ADMIN_USERNAME)
    await page.fill('input[name="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/admin\/(dashboard|products)/)
    
    // Navigate to products
    await page.goto(`${BASE_URL}/admin/products/`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('admin-products-list.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('admin product edit page visual snapshot (CRITICAL)', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/admin/login/`)
    await page.fill('input[name="username"]', ADMIN_USERNAME)
    await page.fill('input[name="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/admin\/(dashboard|products)/)
    
    // Navigate to products and click edit
    await page.goto(`${BASE_URL}/admin/products/`)
    await page.waitForSelector('table tbody tr')
    
    const editLink = page.locator('table tbody tr').first().locator('a:has-text("Edit")')
    await editLink.click()
    
    // Wait for edit page to load (not redirect)
    await page.waitForSelector('input[name="name"]', { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    
    // Take screenshot of edit page
    await expect(page).toHaveScreenshot('admin-product-edit.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
    
    // Verify we're on edit page, not products list
    expect(page.url()).toMatch(/\/admin\/products\/edit/)
  })

  test('admin dashboard visual snapshot', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/admin/login/`)
    await page.fill('input[name="username"]', ADMIN_USERNAME)
    await page.fill('input[name="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/admin\/(dashboard|products)/)
    
    await page.goto(`${BASE_URL}/admin/dashboard/`)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('admin-dashboard.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })
})


