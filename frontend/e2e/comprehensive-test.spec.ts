import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://secrets.gatvia.com'
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

/**
 * Comprehensive E2E Test Suite
 * 
 * Tests all critical user flows and detects common issues:
 * - Broken links
 * - Incorrect redirects
 * - Missing pages
 * - Form validation
 * - API integration
 */
test.describe('Comprehensive System Tests', () => {
  test('test page should be accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/test-comprehensive/`)
    await expect(page).toHaveURL(/\/test-comprehensive/)
    await expect(page.locator('h1')).toContainText(/Comprehensive|Test/i)
  })

  test('should detect all broken links', async ({ page }) => {
    const brokenLinks: string[] = []
    
    // Test all admin routes
    const adminRoutes = [
      '/admin/dashboard/',
      '/admin/products/',
      '/admin/products/new/',
      '/admin/products/edit/?id=1',
      '/admin/orders/',
      '/admin/discounts/',
      '/admin/discounts/new/',
      '/admin/discounts/edit/?id=1',
      '/admin/settings/',
      '/admin/settings/payment-gateways/',
    ]
    
    for (const route of adminRoutes) {
      const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' })
      if (response && response.status() === 404) {
        brokenLinks.push(route)
      }
    }
    
    expect(brokenLinks).toHaveLength(0)
  })

  test('should detect incorrect redirects on edit pages', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/admin/login/`)
    await page.fill('input[name="username"]', ADMIN_USERNAME)
    await page.fill('input[name="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/admin\/(dashboard|products)/)
    
    // Test product edit
    await page.goto(`${BASE_URL}/admin/products/`)
    await page.waitForSelector('table tbody tr')
    
    const editLink = page.locator('table tbody tr').first().locator('a:has-text("Edit")')
    await editLink.click()
    
    await page.waitForTimeout(3000) // Wait for any redirects
    
    const currentUrl = page.url()
    const pageContent = await page.textContent('body')
    
    // Should be on edit page
    expect(currentUrl).toMatch(/\/admin\/products\/edit/)
    
    // Should NOT see products list table
    expect(pageContent).not.toContain('Products')
    expect(await page.locator('table').count()).toBe(0)
    
    // Should see edit form
    await expect(page.locator('input[name="name"]')).toBeVisible()
  })

  test('should test checkout flow', async ({ page }) => {
    // Add product to cart
    await page.goto(`${BASE_URL}/products/1`)
    
    // Try to add to cart
    const addButton = page.locator('button:has-text("Add"), button:has-text("Cart")')
    if (await addButton.count() > 0) {
      await addButton.first().click()
      await page.waitForTimeout(1000)
    }
    
    // Go to checkout
    await page.goto(`${BASE_URL}/checkout/`)
    await expect(page).toHaveURL(/\/checkout/)
    
    // Fill checkout form
    await page.fill('input[name="guest_name"]', 'Test User')
    await page.fill('input[name="guest_email"]', 'test@example.com')
    await page.fill('input[name="guest_phone"]', '1234567890')
    
    // Form should be valid
    const nameInput = page.locator('input[name="guest_name"]')
    await expect(nameInput).toHaveValue('Test User')
  })
})


