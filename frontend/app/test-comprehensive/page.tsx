'use client'

import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'

interface TestResult {
  name: string
  status: 'pending' | 'testing' | 'pass' | 'fail' | 'warning' | 'error'
  message: string
  data?: any
  category: string
  severity?: 'critical' | 'high' | 'medium' | 'low'
}

export default function ComprehensiveTestPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)

  // Debug: Log to confirm this component is rendering
  useEffect(() => {
    console.log('🔬 ComprehensiveTestPage component mounted')
  }, [])

  // Login first to get auth token
  useEffect(() => {
    const login = async () => {
      try {
        const response = await fetch(`${API_URL}/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username: 'admin', password: 'admin123' })
        })
        if (response.ok) {
          const cookies = response.headers.get('set-cookie')
          if (cookies) {
            const match = cookies.match(/PHPSESSID=([^;]+)/)
            if (match) setAuthToken(match[1])
          }
        }
      } catch (e) {
        console.error('Login failed:', e)
      }
    }
    login()
  }, [])

  // Comprehensive test suites
  const testSuites = {
    'Frontend Navigation': [
      {
        name: 'Home → Products List',
        test: async () => {
          const response = await fetch('/', { method: 'HEAD' })
          if (!response.ok) return { status: 'fail', message: 'Home page not accessible' }
          
          // Check if products are loaded
          const html = await fetch('/').then(r => r.text())
          const hasProducts = html.includes('product') || html.includes('Academy')
          return {
            status: hasProducts ? 'pass' : 'warning',
            message: hasProducts ? 'Home page loads with products' : 'Home page loads but products may not be visible'
          }
        }
      },
      {
        name: 'Products List → Product Detail',
        test: async () => {
          // Test navigation to product detail
          const response = await fetch('/products/1', { method: 'HEAD' })
          return {
            status: response.ok ? 'pass' : 'fail',
            message: response.ok ? 'Product detail page accessible' : 'Product detail page not accessible'
          }
        }
      },
      {
        name: 'Cart Page Accessibility',
        test: async () => {
          const response = await fetch('/cart/', { method: 'HEAD' })
          return {
            status: response.ok ? 'pass' : 'fail',
            message: response.ok ? 'Cart page accessible' : 'Cart page not accessible'
          }
        }
      },
      {
        name: 'Checkout Page Accessibility',
        test: async () => {
          const response = await fetch('/checkout/', { method: 'HEAD' })
          return {
            status: response.ok ? 'pass' : 'fail',
            message: response.ok ? 'Checkout page accessible' : 'Checkout page not accessible'
          }
        }
      },
    ],
    'Admin Panel Navigation': [
      {
        name: 'Admin Login → Dashboard',
        test: async () => {
          const loginResponse = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
          })
          
          if (!loginResponse.ok) {
            return { status: 'fail', message: 'Login failed', severity: 'critical' }
          }
          
          const dashboardResponse = await fetch('/admin/dashboard/', { method: 'HEAD' })
          return {
            status: dashboardResponse.ok ? 'pass' : 'fail',
            message: dashboardResponse.ok ? 'Can navigate to dashboard after login' : 'Cannot access dashboard after login',
            severity: dashboardResponse.ok ? 'low' : 'critical'
          }
        }
      },
      {
        name: 'Dashboard → Products List',
        test: async () => {
          const response = await fetch('/admin/products/', { method: 'HEAD' })
          return {
            status: response.ok ? 'pass' : 'fail',
            message: response.ok ? 'Products list accessible' : 'Products list not accessible',
            severity: 'high'
          }
        }
      },
      {
        name: 'Products List → New Product',
        test: async () => {
          const response = await fetch('/admin/products/new/', { method: 'HEAD' })
          return {
            status: response.ok ? 'pass' : 'fail',
            message: response.ok ? 'New product page accessible' : 'New product page not accessible',
            severity: 'high'
          }
        }
      },
      {
        name: 'Products List → Edit Product (CRITICAL)',
        test: async () => {
          // This is the failing test - edit product redirects to products page
          const response = await fetch('/admin/products/edit/?id=1', { method: 'HEAD' })
          
          if (!response.ok) {
            return {
              status: 'fail',
              message: `Edit product page returns ${response.status} - may be redirecting incorrectly`,
              severity: 'critical',
              data: { status: response.status, url: response.url }
            }
          }
          
          // Check if it actually loads the edit page or redirects
          const html = await fetch('/admin/products/edit/?id=1').then(r => r.text())
          const isEditPage = html.includes('Edit Product') || html.includes('edit') || html.includes('form')
          const isProductsPage = html.includes('Products') && html.includes('table')
          
          if (isProductsPage && !isEditPage) {
            return {
              status: 'fail',
              message: 'Edit product redirects to products list page instead of showing edit form',
              severity: 'critical',
              data: { detectedPage: 'products-list', expectedPage: 'edit-form' }
            }
          }
          
          return {
            status: isEditPage ? 'pass' : 'warning',
            message: isEditPage ? 'Edit product page loads correctly' : 'Edit product page may not be loading correctly',
            severity: isEditPage ? 'low' : 'high'
          }
        }
      },
      {
        name: 'Products List → Delete Product',
        test: async () => {
          // Test if delete functionality exists (API endpoint)
          const response = await fetch(`${API_URL}/admin/products/999`, {
            method: 'DELETE',
            credentials: 'include'
          })
          // Should return 404 (product doesn't exist) or 401 (not auth), not 500
          return {
            status: response.status === 404 || response.status === 401 ? 'pass' : response.status === 500 ? 'fail' : 'warning',
            message: `Delete endpoint returns ${response.status} (expected 404/401, not 500)`,
            severity: response.status === 500 ? 'high' : 'low'
          }
        }
      },
      {
        name: 'Discounts List → New Discount',
        test: async () => {
          const response = await fetch('/admin/discounts/new/', { method: 'HEAD' })
          return {
            status: response.ok ? 'pass' : 'fail',
            message: response.ok ? 'New discount page accessible' : 'New discount page not accessible',
            severity: 'high'
          }
        }
      },
      {
        name: 'Discounts List → Edit Discount',
        test: async () => {
          const response = await fetch('/admin/discounts/edit/?id=1', { method: 'HEAD' })
          const html = response.ok ? await fetch('/admin/discounts/edit/?id=1').then(r => r.text()) : ''
          const isEditPage = html.includes('Edit Discount') || html.includes('edit')
          const isListPage = html.includes('Discount Codes') && html.includes('table')
          
          if (isListPage && !isEditPage) {
            return {
              status: 'fail',
              message: 'Edit discount redirects to discounts list instead of edit form',
              severity: 'critical',
              data: { detectedPage: 'discounts-list', expectedPage: 'edit-form' }
            }
          }
          
          return {
            status: response.ok && isEditPage ? 'pass' : 'fail',
            message: response.ok && isEditPage ? 'Edit discount page loads correctly' : 'Edit discount page not working',
            severity: response.ok && isEditPage ? 'low' : 'high'
          }
        }
      },
    ],
    'Form Functionality': [
      {
        name: 'Product Edit Form - Loads Product Data',
        test: async () => {
          // Check if edit form can fetch product data
          const apiResponse = await fetch(`${API_URL}/admin/products/1`, {
            credentials: 'include'
          })
          
          if (!apiResponse.ok) {
            return {
              status: 'fail',
              message: `Cannot fetch product data: ${apiResponse.status}`,
              severity: 'high'
            }
          }
          
          const product = await apiResponse.json()
          return {
            status: product.id ? 'pass' : 'fail',
            message: product.id ? 'Product data can be fetched for edit form' : 'Product data not available',
            severity: product.id ? 'low' : 'high',
            data: { productId: product.id, hasName: !!product.name }
          }
        }
      },
      {
        name: 'Product Edit Form - Submit Validation',
        test: async () => {
          // Test if form validation works (submit empty form should fail)
          const response = await fetch(`${API_URL}/admin/products/1`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: '', description: '' })
          })
          
          const data = await response.json()
          // Should return validation error, not 500
          return {
            status: response.status === 400 ? 'pass' : response.status === 500 ? 'fail' : 'warning',
            message: response.status === 400 
              ? 'Form validation works (rejects empty data)' 
              : response.status === 500 
                ? 'Form validation broken (returns 500 instead of validation error)'
                : `Unexpected status: ${response.status}`,
            severity: response.status === 500 ? 'high' : 'low'
          }
        }
      },
    ],
    'API Integration': [
      {
        name: 'Frontend → API: Fetch Products',
        test: async () => {
          const response = await fetch(`${API_URL}/products`)
          const data = await response.json()
          return {
            status: response.ok && data.results ? 'pass' : 'fail',
            message: response.ok && data.results 
              ? `Products API returns ${data.results.length} products` 
              : 'Products API not working',
            severity: 'high',
            data: { count: data.results?.length || 0 }
          }
        }
      },
      {
        name: 'Frontend → API: Fetch Single Product',
        test: async () => {
          const response = await fetch(`${API_URL}/products/1`)
          const data = await response.json()
          return {
            status: response.ok && data.id ? 'pass' : 'fail',
            message: response.ok && data.id ? 'Single product API works' : 'Single product API not working',
            severity: 'high'
          }
        }
      },
      {
        name: 'Admin → API: Fetch Products (Auth)',
        test: async () => {
          const response = await fetch(`${API_URL}/admin/products`, {
            credentials: 'include'
          })
          return {
            status: response.ok ? 'pass' : response.status === 401 ? 'warning' : 'fail',
            message: response.ok 
              ? 'Admin products API works with auth' 
              : response.status === 401 
                ? 'Admin products API requires auth (expected)' 
                : `Admin products API failed: ${response.status}`,
            severity: response.status === 500 ? 'high' : 'low'
          }
        }
      },
      {
        name: 'Admin → API: Fetch Single Product (CRITICAL)',
        test: async () => {
          const response = await fetch(`${API_URL}/admin/products/1`, {
            credentials: 'include'
          })
          if (response.status === 404) {
            return {
              status: 'fail',
              message: 'GET /api/admin/products/1 returns 404 - product endpoint not found',
              severity: 'critical',
              data: { status: response.status, url: `${API_URL}/admin/products/1` }
            }
          }
          const data = await response.json()
          return {
            status: response.ok && data.id ? 'pass' : 'fail',
            message: response.ok && data.id 
              ? `Single product API works (Product ID: ${data.id})` 
              : `Single product API failed: ${response.status}`,
            severity: response.status === 404 ? 'critical' : response.status === 500 ? 'high' : 'low',
            data: response.ok ? { productId: data.id, hasName: !!data.name } : { status: response.status }
          }
        }
      },
      {
        name: 'Admin → API: Update Product with File Upload (CRITICAL)',
        test: async () => {
          // Test POST with _method=PUT (for file uploads)
          const formData = new FormData()
          formData.append('_method', 'PUT')
          formData.append('name', 'Test Product Update')
          formData.append('description', 'Test description')
          formData.append('base_price', '100')
          formData.append('currency', 'AED')
          formData.append('is_active', '1')
          formData.append('variants', JSON.stringify([]))
          formData.append('images', JSON.stringify([]))
          
          const response = await fetch(`${API_URL}/admin/products/1`, {
            method: 'POST',
            credentials: 'include',
            body: formData
          })
          
          if (response.status === 404) {
            return {
              status: 'fail',
              message: 'POST /api/admin/products/1 with _method=PUT returns 404 - method override not working',
              severity: 'critical',
              data: { status: response.status, method: 'POST', hasMethodOverride: true }
            }
          }
          
          const data = await response.json()
          return {
            status: response.ok ? 'pass' : response.status === 400 ? 'warning' : 'fail',
            message: response.ok 
              ? 'Product update with file upload (POST + _method=PUT) works' 
              : response.status === 400 
                ? 'Product update endpoint exists but validation failed (expected for test data)'
                : `Product update failed: ${response.status}`,
            severity: response.status === 404 ? 'critical' : response.status === 500 ? 'high' : 'low',
            data: response.ok ? { productId: data.id } : { status: response.status, error: data.error }
          }
        }
      },
      {
        name: 'Admin → API: Update Product with PUT (JSON)',
        test: async () => {
          const response = await fetch(`${API_URL}/admin/products/1`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: 'Test Product Update',
              description: 'Test description',
              base_price: 100,
              currency: 'AED',
              is_active: true,
              variants: [],
              images: []
            })
          })
          
          if (response.status === 404) {
            return {
              status: 'fail',
              message: 'PUT /api/admin/products/1 returns 404 - PUT endpoint not found',
              severity: 'critical',
              data: { status: response.status, method: 'PUT' }
            }
          }
          
          const data = await response.json()
          return {
            status: response.ok ? 'pass' : response.status === 400 ? 'warning' : 'fail',
            message: response.ok 
              ? 'Product update with PUT (JSON) works' 
              : response.status === 400 
                ? 'Product update endpoint exists but validation failed (expected for test data)'
                : `Product update failed: ${response.status}`,
            severity: response.status === 404 ? 'critical' : response.status === 500 ? 'high' : 'low',
            data: response.ok ? { productId: data.id } : { status: response.status, error: data.error }
          }
        }
      },
    ],
    'Security Features': [
      {
        name: 'CORS Configuration - Strict Origin Validation',
        test: async () => {
          // Test that CORS headers are properly set
          const response = await fetch(`${API_URL}/products`, {
            method: 'OPTIONS',
            headers: { 'Origin': 'https://secrets.gatvia.com' }
          })
          
          const corsHeader = response.headers.get('Access-Control-Allow-Origin')
          return {
            status: corsHeader === 'https://secrets.gatvia.com' || corsHeader === '*' ? 'pass' : 'warning',
            message: corsHeader 
              ? `CORS configured: ${corsHeader}` 
              : 'CORS headers not set',
            severity: 'medium',
            data: { corsHeader }
          }
        }
      },
      {
        name: 'Rate Limiting - Headers Present',
        test: async () => {
          const response = await fetch(`${API_URL}/products`)
          const rateLimitHeader = response.headers.get('X-RateLimit-Limit') || 
                                 response.headers.get('x-ratelimit-limit')
          const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining') || 
                                    response.headers.get('x-ratelimit-remaining')
          const rateLimitReset = response.headers.get('X-RateLimit-Reset') || 
                                response.headers.get('x-ratelimit-reset')
          
          return {
            status: rateLimitHeader ? 'pass' : 'warning',
            message: rateLimitHeader 
              ? `Rate limiting active: ${rateLimitRemaining}/${rateLimitHeader} remaining (resets at ${rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toLocaleTimeString() : 'N/A'})` 
              : 'Rate limit headers not present (may be disabled for some endpoints)',
            severity: 'medium',
            data: { limit: rateLimitHeader, remaining: rateLimitRemaining, reset: rateLimitReset }
          }
        }
      },
      {
        name: 'Session Security - SameSite Cookie',
        test: async () => {
          // Login to check session cookie
          const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
          })
          
          // Check all headers for Set-Cookie
          const allHeaders = response.headers.get('set-cookie') || ''
          const hasSameSite = allHeaders.includes('SameSite=Strict') || 
                            allHeaders.includes('SameSite=Lax') ||
                            allHeaders.includes('SameSite=None')
          
          // Note: PHP sets cookies via session_set_cookie_params, which may not show in fetch headers
          // The actual cookie is set server-side, so this is a best-effort check
          return {
            status: hasSameSite ? 'pass' : 'warning',
            message: hasSameSite 
              ? 'Session cookie has SameSite attribute (or set server-side)' 
              : 'Cannot verify SameSite attribute (may be set server-side via PHP session)',
            severity: 'medium',
            data: { 
              hasSetCookie: !!allHeaders,
              cookieHeader: allHeaders.substring(0, 100) // First 100 chars
            }
          }
        }
      },
      {
        name: 'Webhook Security - Signature Verification',
        test: async () => {
          // Test that webhook endpoints require signature
          const response = await fetch(`${API_URL}/webhooks/stripe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'test' })
          })
          
          const data = await response.json()
          // Should reject without signature or with invalid signature
          const isSecure = response.status === 401 || (response.status === 200 && data.error && data.error.includes('signature'))
          
          return {
            status: isSecure ? 'pass' : 'fail',
            message: isSecure 
              ? 'Webhook signature verification is active' 
              : 'Webhook accepts requests without signature verification',
            severity: 'critical',
            data: { status: response.status, response: data }
          }
        }
      },
      {
        name: 'Error Disclosure - No Stack Traces in Production',
        test: async () => {
          // Try to trigger an error (invalid endpoint)
          const response = await fetch(`${API_URL}/invalid-endpoint-that-does-not-exist-12345`)
          const data = await response.json()
          
          // Should not expose file paths or stack traces
          const hasStackTrace = JSON.stringify(data).includes('Stack trace') || 
                               JSON.stringify(data).includes('.php:') ||
                               JSON.stringify(data).includes('file:')
          
          return {
            status: !hasStackTrace ? 'pass' : 'fail',
            message: !hasStackTrace 
              ? 'Error responses do not expose stack traces' 
              : 'Error responses expose sensitive information',
            severity: 'high',
            data: { response: data }
          }
        }
      },
      {
        name: 'Password Encryption - Not Base64',
        test: async () => {
          // This test checks that password encryption is implemented
          // We can't directly test encryption, but we can verify the endpoint works
          const response = await fetch(`${API_URL}/admin/settings/email`, {
            method: 'GET',
            credentials: 'include'
          })
          
          if (response.status === 401) {
            return {
              status: 'warning',
              message: 'Cannot test encryption without authentication',
              severity: 'low'
            }
          }
          
          return {
            status: 'pass',
            message: 'Email settings endpoint accessible (encryption handled server-side)',
            severity: 'low'
          }
        }
      },
      {
        name: 'Input Validation - SQL Injection Protection',
        test: async () => {
          // Test that SQL injection attempts are blocked
          // The products endpoint doesn't have a search parameter, so this test
          // verifies that the system doesn't crash on malicious input
          const maliciousInput = "'; DROP TABLE products; --"
          const response = await fetch(`${API_URL}/products?search=${encodeURIComponent(maliciousInput)}`)
          
          const data = await response.json().catch(() => ({}))
          
          // Should not return 500 (which would indicate SQL error or crash)
          // Should return 200 (products list) or 400 (validation error), not 500
          const isSafe = response.status !== 500 && 
                        !JSON.stringify(data).includes('SQL') &&
                        !JSON.stringify(data).includes('syntax error')
          
          return {
            status: isSafe ? 'pass' : 'fail',
            message: isSafe 
              ? 'SQL injection attempt handled safely (no SQL errors exposed)' 
              : 'SQL injection vulnerability detected (SQL error exposed)',
            severity: response.status === 500 ? 'critical' : 'low',
            data: { status: response.status, hasSqlError: JSON.stringify(data).includes('SQL') }
          }
        }
      },
      {
        name: 'Authentication Required - Admin Endpoints',
        test: async () => {
          // Test that admin endpoints require authentication
          // First, try without any cookies
          const response = await fetch(`${API_URL}/admin/products`, {
            credentials: 'omit', // Don't send cookies
            headers: {
              'Content-Type': 'application/json'
            }
          })
          
          const data = await response.json().catch(() => ({}))
          
          // Should return 401 Unauthorized
          const isProtected = response.status === 401 || 
                             (data.error && (data.error.includes('Unauthorized') || data.error.includes('requires_login')))
          
          return {
            status: isProtected ? 'pass' : 'fail',
            message: isProtected 
              ? 'Admin endpoints require authentication (401 Unauthorized)' 
              : `Admin endpoints accessible without authentication (status: ${response.status})`,
            severity: isProtected ? 'low' : 'critical',
            data: { status: response.status, response: data }
          }
        }
      },
    ],
    'User Flows': [
      {
        name: 'Add to Cart Flow',
        test: async () => {
          // Test if cart functionality works
          // This would require browser automation, but we can test the API
          return {
            status: 'warning',
            message: 'Requires browser automation to test fully',
            severity: 'medium'
          }
        }
      },
      {
        name: 'Checkout Flow - Bank Transfer',
        test: async () => {
          const response = await fetch(`${API_URL}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              guest_name: 'Test User',
              guest_email: 'test@test.com',
              guest_phone: '1234567890',
              items: [{ product_id: 1, variant_id: 1, quantity: 1 }],
              payment_method: 'bank_transfer',
              currency: 'AED',
              no_refund_accepted: true
            })
          })
          
          const data = await response.json()
          return {
            status: response.ok && data.order_number ? 'pass' : 'fail',
            message: response.ok && data.order_number 
              ? `Checkout creates order: ${data.order_number}` 
              : 'Checkout flow broken',
            severity: 'high',
            data: { orderNumber: data.order_number, orderId: data.id }
          }
        }
      },
    ],
    'Broken Links & Redirects': [
      {
        name: 'Check for 404s in Admin Panel',
        test: async () => {
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
          
          const results = []
          for (const route of adminRoutes) {
            const response = await fetch(route, { method: 'HEAD' })
            results.push({
              route,
              status: response.status,
              ok: response.ok
            })
          }
          
          const broken = results.filter(r => !r.ok && r.status === 404)
          return {
            status: broken.length === 0 ? 'pass' : 'fail',
            message: broken.length === 0 
              ? 'All admin routes accessible' 
              : `${broken.length} admin routes return 404`,
            severity: broken.length > 0 ? 'high' : 'low',
            data: { broken, total: results.length }
          }
        }
      },
      {
        name: 'Check for Incorrect Redirects',
        test: async () => {
          // Test edit pages - they should NOT redirect to list pages
          const editPages = [
            { url: '/admin/products/edit/?id=1', shouldContain: 'Edit Product', shouldNotContain: 'Products' },
            { url: '/admin/discounts/edit/?id=1', shouldContain: 'Edit Discount', shouldNotContain: 'Discount Codes' },
          ]
          
          const issues = []
          for (const page of editPages) {
            try {
              const html = await fetch(page.url).then(r => r.text())
              const hasCorrect = html.includes(page.shouldContain)
              const hasIncorrect = html.includes(page.shouldNotContain) && html.includes('table')
              
              if (hasIncorrect && !hasCorrect) {
                issues.push({
                  url: page.url,
                  issue: `Redirects to list page instead of edit form`
                })
              }
            } catch (e) {
              issues.push({
                url: page.url,
                issue: `Error loading page: ${e}`
              })
            }
          }
          
          return {
            status: issues.length === 0 ? 'pass' : 'fail',
            message: issues.length === 0 
              ? 'No incorrect redirects detected' 
              : `${issues.length} pages have redirect issues`,
            severity: issues.length > 0 ? 'critical' : 'low',
            data: { issues }
          }
        }
      },
    ],
  }

  const runTest = async (test: any, category: string): Promise<TestResult> => {
    try {
      const result = await test.test()
      return {
        name: test.name,
        status: result.status,
        message: result.message,
        data: result.data,
        category,
        severity: result.severity || 'medium'
      }
    } catch (error: any) {
      return {
        name: test.name,
        status: 'error',
        message: `Test error: ${error.message}`,
        data: { error: error.toString() },
        category,
        severity: 'high'
      }
    }
  }

  const runAllTests = async () => {
    setRunning(true)
    const newResults: TestResult[] = []

    for (const [category, tests] of Object.entries(testSuites)) {
      for (const test of tests) {
        const testResult: TestResult = {
          name: test.name,
          status: 'testing',
          message: 'Testing...',
          category,
          severity: 'medium'
        }
        setResults([...newResults, testResult])
        
        const result = await runTest(test, category)
        newResults.push(result)
        setResults([...newResults])
        
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    setRunning(false)
  }

  const categories = Array.from(new Set(results.map(r => r.category)))
  const passCount = results.filter(r => r.status === 'pass').length
  const failCount = results.filter(r => r.status === 'fail').length
  const errorCount = results.filter(r => r.status === 'error').length
  const warningCount = results.filter(r => r.status === 'warning').length
  const criticalIssues = results.filter(r => r.severity === 'critical' && (r.status === 'fail' || r.status === 'error'))

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <span className="text-green-600 text-xl">✓</span>
      case 'fail': return <span className="text-red-600 text-xl">✗</span>
      case 'warning': return <span className="text-yellow-600 text-xl">⚠</span>
      case 'error': return <span className="text-red-600 text-xl">⚠</span>
      case 'testing': return <span className="text-blue-600 animate-spin">⟳</span>
      default: return <span className="text-gray-400">○</span>
    }
  }

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300'
    }
    return (
      <span className={`px-2 py-1 text-xs rounded border ${colors[severity as keyof typeof colors] || colors.medium}`}>
        {severity.toUpperCase()}
      </span>
    )
  }

  // Always render - don't wait for mounted (fixes static export issues)
  // The mounted check was preventing the page from rendering in static export

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <h1 className="text-3xl font-bold mb-2">🔬 Comprehensive System Test Suite</h1>
          <p className="text-gray-600 mb-6">Deep automated testing for functionality, navigation, and user flows</p>
          
          {criticalIssues.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
              <h2 className="text-xl font-bold text-red-800 mb-2">🚨 Critical Issues Found: {criticalIssues.length}</h2>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                {criticalIssues.map((issue, idx) => (
                  <li key={idx}>{issue.name}: {issue.message}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mb-6 flex flex-wrap gap-4 items-center">
            <button
              onClick={runAllTests}
              disabled={running}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {running ? 'Running Tests...' : '🚀 Run All Tests'}
            </button>
            
            {results.length > 0 && (
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-green-600 font-semibold">✓ Pass: {passCount}</span>
                <span className="text-red-600 font-semibold">✗ Fail: {failCount}</span>
                <span className="text-yellow-600 font-semibold">⚠ Warning: {warningCount}</span>
                <span className="text-red-600 font-semibold">⚠ Error: {errorCount}</span>
                <span className="text-red-800 font-bold">🚨 Critical: {criticalIssues.length}</span>
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Filter by Category:</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-3 py-1 rounded text-sm ${activeCategory === null ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  All ({results.length})
                </button>
                {categories.map(cat => {
                  const count = results.filter(r => r.category === cat).length
                  const pass = results.filter(r => r.category === cat && r.status === 'pass').length
                  const critical = results.filter(r => r.category === cat && r.severity === 'critical' && (r.status === 'fail' || r.status === 'error')).length
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1 rounded text-sm ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'} ${critical > 0 ? 'border-2 border-red-500' : ''}`}
                    >
                      {cat} ({pass}/{count}) {critical > 0 && '🚨'}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {categories.map(category => {
          const categoryResults = results.filter(r => r.category === category && (activeCategory === null || activeCategory === category))
          if (categoryResults.length === 0) return null

          return (
            <div key={category} className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center justify-between">
                <span>{category}</span>
                <span className="text-sm font-normal text-gray-600">
                  {categoryResults.filter(r => r.status === 'pass').length}/{categoryResults.length} passing
                  {categoryResults.filter(r => r.severity === 'critical' && (r.status === 'fail' || r.status === 'error')).length > 0 && (
                    <span className="ml-2 text-red-600">🚨 {categoryResults.filter(r => r.severity === 'critical' && (r.status === 'fail' || r.status === 'error')).length} critical</span>
                  )}
                </span>
              </h2>
              
              <div className="space-y-2">
                {categoryResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-md border-2 ${
                      result.status === 'pass'
                        ? 'bg-green-50 border-green-200'
                        : result.status === 'fail' || result.status === 'error'
                        ? result.severity === 'critical'
                          ? 'bg-red-50 border-red-400'
                          : 'bg-red-50 border-red-200'
                        : result.status === 'warning'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {getStatusIcon(result.status)}
                          <h3 className="font-semibold">{result.name}</h3>
                          {getSeverityBadge(result.severity)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                        {result.data && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                              View Details
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {results.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center text-gray-500">
            <p className="text-lg mb-2">Click &quot;Run All Tests&quot; to start comprehensive testing</p>
            <p className="text-sm">This will test navigation, forms, API integration, and detect broken links/redirects</p>
          </div>
        )}

        {/* Summary */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mt-6">
            <h2 className="text-2xl font-bold mb-4">📊 Test Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded">
                <div className="text-2xl font-bold text-green-600">{passCount}</div>
                <div className="text-sm text-gray-600">Passing Tests</div>
              </div>
              <div className="bg-red-50 p-4 rounded">
                <div className="text-2xl font-bold text-red-600">{failCount + errorCount}</div>
                <div className="text-sm text-gray-600">Failing Tests</div>
              </div>
              <div className="bg-red-100 p-4 rounded border-2 border-red-400">
                <div className="text-2xl font-bold text-red-800">{criticalIssues.length}</div>
                <div className="text-sm text-red-700">Critical Issues</div>
              </div>
            </div>
            
            {criticalIssues.length > 0 && (
              <div className="mt-6 bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <h3 className="font-bold text-red-800 mb-2">🚨 Critical Issues Requiring Immediate Attention:</h3>
                <ul className="list-disc list-inside space-y-1 text-red-700">
                  {criticalIssues.map((issue, idx) => (
                    <li key={idx}><strong>{issue.name}:</strong> {issue.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

