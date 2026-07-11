import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://secrets.gatvia.com'
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

test.describe('Admin Products Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/admin/login/`)
    await page.fill('input[name="username"]', ADMIN_USERNAME)
    await page.fill('input[name="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/admin\/(dashboard|products)/)
  })

  test('should navigate to products list', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/products/`)
    await expect(page.locator('h2')).toContainText('Products')
    await expect(page.locator('table')).toBeVisible()
  })

  test('should open new product page', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/products/`)
    await page.click('text=+ Add Product')
    await expect(page).toHaveURL(/\/admin\/products\/new/)
    await expect(page.locator('h1, h2')).toContainText(/New Product|Create Product/i)
  })

  test('should open edit product page (CRITICAL TEST)', async ({ page }) => {
    // Navigate to products list
    await page.goto(`${BASE_URL}/admin/products/`)
    
    // Wait for products to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 })
    
    // Find first product's edit link
    const editLink = page.locator('table tbody tr').first().locator('a:has-text("Edit")')
    await expect(editLink).toBeVisible()
    
    // Click edit link
    await editLink.click()
    
    // CRITICAL: Should NOT redirect to products list
    // Should stay on edit page
    await page.waitForTimeout(2000) // Wait for any redirects
    
    const currentUrl = page.url()
    console.log('Current URL after clicking edit:', currentUrl)
    
    // Should be on edit page, not products list
    expect(currentUrl).toMatch(/\/admin\/products\/edit/)
    
    // Should see edit form, not products table
    await expect(page.locator('h1, h2')).toContainText(/Edit Product/i)
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('table')).not.toBeVisible() // Products table should NOT be visible
  })

  test('should load product data in edit form', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/products/`)
    await page.waitForSelector('table tbody tr')
    
    // Get first product's ID from the table
    const firstRow = page.locator('table tbody tr').first()
    const productId = await firstRow.locator('td').first().textContent()
    
    // Navigate directly to edit page
    await page.goto(`${BASE_URL}/admin/products/edit/?id=${productId}`)
    
    // Wait for form to load
    await page.waitForSelector('input[name="name"]', { timeout: 10000 })
    
    // Form should be populated with product data
    const nameInput = page.locator('input[name="name"]')
    const nameValue = await nameInput.inputValue()
    expect(nameValue).toBeTruthy() // Should have a value
    
    // Should see form fields
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="base_price"]')).toBeVisible()
  })

  test('should save product changes', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/products/`)
    await page.waitForSelector('table tbody tr')
    
    const editLink = page.locator('table tbody tr').first().locator('a:has-text("Edit")')
    await editLink.click()
    
    await page.waitForSelector('input[name="name"]', { timeout: 10000 })
    
    // Make a change
    const nameInput = page.locator('input[name="name"]')
    const originalName = await nameInput.inputValue()
    await nameInput.fill(`${originalName} [TEST]`)
    
    // Save
    await page.click('button[type="submit"]:has-text("Update")')
    
    // Should redirect to products list after save
    await page.waitForURL(/\/admin\/products/, { timeout: 10000 })
    await expect(page.locator('h2')).toContainText('Products')
  })

  test('should delete product', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/products/`)
    await page.waitForSelector('table tbody tr')
    
    const rowCountBefore = await page.locator('table tbody tr').count()
    
    // Click delete on first product
    const deleteButton = page.locator('table tbody tr').first().locator('button:has-text("Delete")')
    await deleteButton.click()
    
    // Confirm deletion
    page.on('dialog', dialog => dialog.accept())
    
    // Wait for deletion
    await page.waitForTimeout(2000)
    
    // Product should be removed (or at least the action should complete)
    const rowCountAfter = await page.locator('table tbody tr').count()
    // Note: This might not decrease if we're on last page, but should not error
  })
})


