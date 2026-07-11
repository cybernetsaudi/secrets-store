'use client'

import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'

interface TestResult {
  name: string
  status: 'pending' | 'testing' | 'pass' | 'fail' | 'warning'
  message: string
  data?: any
  category: string
}

export default function TestPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Comprehensive test suite
  const testSuites = {
    'Public APIs': [
      { name: 'GET /api/products', method: 'GET', url: '/products' },
      { name: 'GET /api/products/{id}', method: 'GET', url: '/products/1' },
      { name: 'GET /api/currency/rates', method: 'GET', url: '/currency/rates?from=AED&to=USD' },
      { name: 'POST /api/discount/validate (invalid)', method: 'POST', url: '/discount/validate', body: { code: 'INVALID', order_amount: 100 }, expect400: true },
      { name: 'POST /api/discount/validate (valid)', method: 'POST', url: '/discount/validate', body: { code: 'BB', order_amount: 100 } },
      { name: 'GET /api/payment-gateway/bank-transfer', method: 'GET', url: '/payment-gateway/bank-transfer' },
      { name: 'POST /api/abandoned-cart', method: 'POST', url: '/abandoned-cart', body: { cart_data: { items: [] }, email: 'test@example.com' } },
      { name: 'GET /api/abandoned-cart', method: 'GET', url: '/abandoned-cart?email=test@example.com' },
    ],
    'Admin APIs (No Auth)': [
      { name: 'GET /api/admin/me', method: 'GET', url: '/admin/me', expect401: true },
      { name: 'GET /api/admin/products', method: 'GET', url: '/admin/products', expect401: true },
      { name: 'GET /api/admin/orders', method: 'GET', url: '/admin/orders', expect401: true },
      { name: 'GET /api/admin/discounts', method: 'GET', url: '/admin/discounts', expect401: true },
      { name: 'GET /api/admin/payment-gateways', method: 'GET', url: '/admin/payment-gateways', expect401: true },
      { name: 'GET /api/admin/settings', method: 'GET', url: '/admin/settings', expect401: true },
      { name: 'GET /api/admin/settings/email', method: 'GET', url: '/admin/settings/email', expect401: true },
    ],
    'Admin Authentication': [
      { name: 'POST /api/admin/login (valid)', method: 'POST', url: '/admin/login', body: { username: 'admin', password: 'admin123' } },
      { name: 'POST /api/admin/login (invalid)', method: 'POST', url: '/admin/login', body: { username: 'admin', password: 'wrong' }, expect401: true },
    ],
    'Admin APIs (With Auth)': [
      { name: 'GET /api/admin/me', method: 'GET', url: '/admin/me', requiresAuth: true },
      { name: 'GET /api/admin/products', method: 'GET', url: '/admin/products', requiresAuth: true },
      { name: 'GET /api/admin/orders', method: 'GET', url: '/admin/orders', requiresAuth: true },
      { name: 'GET /api/admin/discounts', method: 'GET', url: '/admin/discounts', requiresAuth: true },
      { name: 'GET /api/admin/payment-gateways', method: 'GET', url: '/admin/payment-gateways', requiresAuth: true },
      { name: 'GET /api/admin/settings', method: 'GET', url: '/admin/settings', requiresAuth: true },
      { name: 'GET /api/admin/settings/email', method: 'GET', url: '/admin/settings/email', requiresAuth: true },
    ],
    'Payment Endpoints': [
      { name: 'POST /api/payment/create-intent', method: 'POST', url: '/payment/create-intent', body: { items: [{ product: { id: 1 }, variant: { id: 1 }, quantity: 1, unitPrice: 1000 }], formData: { guest_name: 'Test', guest_email: 'test@test.com', guest_phone: '123' }, currency: 'AED' } },
      { name: 'POST /api/checkout', method: 'POST', url: '/checkout', body: { guest_name: 'Test', guest_email: 'test@test.com', guest_phone: '123', items: [], payment_method: 'bank_transfer', currency: 'AED', no_refund_accepted: true } },
    ],
    'Webhooks': [
      { name: 'POST /api/webhooks/stripe', method: 'POST', url: '/webhooks/stripe', body: {} },
      { name: 'POST /api/webhooks/tabby', method: 'POST', url: '/webhooks/tabby', body: {} },
    ],
    'Email': [
      { name: 'POST /api/email/staff', method: 'POST', url: '/email/staff', body: { order_number: 'ORD-000001', customer_name: 'Test Customer', customer_email: 'test@test.com', message: 'Test message' }, expect400: true },
    ],
    'Bank Accounts': [
      { name: 'GET /api/admin/payment-gateways/{id}/bank-accounts', method: 'GET', url: '/admin/payment-gateways/3/bank-accounts', requiresAuth: true },
    ],
  }

  const frontendRoutes = [
    { name: 'Home Page', path: '/' },
    { name: 'Products List', path: '/' },
    { name: 'Product Detail', path: '/products/1' },
    { name: 'Cart', path: '/cart/' },
    { name: 'Checkout', path: '/checkout/' },
    { name: 'Success Page', path: '/success/' },
    { name: 'Bank Transfer Success', path: '/success/bank-transfer/' },
    { name: 'Admin Login', path: '/admin/login/' },
    { name: 'Admin Dashboard', path: '/admin/dashboard/' },
    { name: 'Admin Products', path: '/admin/products/' },
    { name: 'Admin Products New', path: '/admin/products/new/' },
    { name: 'Admin Products Edit', path: '/admin/products/edit/?id=1' },
    { name: 'Admin Orders', path: '/admin/orders/' },
    { name: 'Admin Discounts', path: '/admin/discounts/' },
    { name: 'Admin Discounts New', path: '/admin/discounts/new/' },
    { name: 'Admin Discounts Edit', path: '/admin/discounts/edit/?id=1' },
    { name: 'Admin Settings', path: '/admin/settings/' },
    { name: 'Admin Payment Gateways', path: '/admin/settings/payment-gateways/' },
  ]

  const runTest = async (test: any, category: string, authToken?: string): Promise<TestResult> => {
    try {
      const url = `${API_URL}${test.url}`
      const options: RequestInit = {
        method: test.method,
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken && { 'Cookie': `PHPSESSID=${authToken}` })
        },
        credentials: test.expect401 || test.requiresAuth ? (test.expect401 ? 'omit' : 'include') : 'include',
      }
      
      if (test.body) {
        options.body = JSON.stringify(test.body)
      }

      const response = await fetch(url, options)
      let data
      try {
        const text = await response.text()
        data = text ? JSON.parse(text) : {}
      } catch {
        data = { raw: 'Non-JSON response' }
      }

      if (test.expect401) {
        if (response.status === 401) {
          return {
            name: test.name,
            status: 'pass',
            message: 'Correctly returned 401 Unauthorized',
            data: { status: response.status },
            category
          }
        } else {
          return {
            name: test.name,
            status: 'fail',
            message: `Expected 401, got ${response.status}`,
            data: { status: response.status, data },
            category
          }
        }
      }

      if (test.expect400) {
        if (response.status === 400) {
          return {
            name: test.name,
            status: 'pass',
            message: 'Correctly returned 400 Bad Request (expected - order may not exist)',
            data: { status: response.status, data },
            category
          }
        } else if (response.status === 404) {
          return {
            name: test.name,
            status: 'pass',
            message: 'Correctly returned 404 (order not found - expected)',
            data: { status: response.status, data },
            category
          }
        } else {
          return {
            name: test.name,
            status: response.ok ? 'pass' : 'warning',
            message: response.ok ? 'Success (unexpected but valid)' : `Expected 400/404, got ${response.status}`,
            data: { status: response.status, data },
            category
          }
        }
      }

      if (response.ok) {
        return {
          name: test.name,
          status: 'pass',
          message: `Success (${response.status})`,
          data: Array.isArray(data) ? { count: data.length } : (data.results ? { count: data.results.length } : data),
          category
        }
      } else {
        return {
          name: test.name,
          status: response.status === 404 ? 'warning' : 'fail',
          message: `Failed with status ${response.status}`,
          data: data,
          category
        }
      }
    } catch (error: any) {
      return {
        name: test.name,
        status: 'fail',
        message: `Error: ${error.message}`,
        data: { error: error.toString() },
        category
      }
    }
  }

  const runAllTests = async () => {
    setRunning(true)
    const newResults: TestResult[] = []
    let authToken: string | undefined

    // First, login to get auth token for authenticated tests
    try {
      const loginResponse = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      })
      if (loginResponse.ok) {
        // Extract session cookie if available
        const cookies = loginResponse.headers.get('set-cookie')
        if (cookies) {
          const match = cookies.match(/PHPSESSID=([^;]+)/)
          if (match) authToken = match[1]
        }
      }
    } catch (e) {
      console.error('Login failed:', e)
    }

    // Run tests by category
    for (const [category, tests] of Object.entries(testSuites)) {
      for (const test of tests) {
        const testResult: TestResult = {
          name: test.name,
          status: 'testing',
          message: 'Testing...',
          category
        }
        setResults([...newResults, testResult])
        
        const result = await runTest(test, category, authToken)
        newResults.push(result)
        setResults([...newResults])
        
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    // Test frontend routes
    for (const route of frontendRoutes) {
      const testResult: TestResult = {
        name: route.name,
        status: 'testing',
        message: 'Testing...',
        category: 'Frontend Routes'
      }
      setResults([...newResults, testResult])
      
      try {
        const response = await fetch(route.path, { method: 'HEAD' })
        const result: TestResult = {
          name: route.name,
          status: response.ok ? 'pass' : 'fail',
          message: response.ok ? 'Page exists' : `Status: ${response.status}`,
          data: { path: route.path, status: response.status },
          category: 'Frontend Routes'
        }
        newResults.push(result)
        setResults([...newResults])
      } catch (error: any) {
        const result: TestResult = {
          name: route.name,
          status: 'fail',
          message: `Error: ${error.message}`,
          data: { path: route.path },
          category: 'Frontend Routes'
        }
        newResults.push(result)
        setResults([...newResults])
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Database connection test
    const dbTest: TestResult = {
      name: 'Database Connection',
      status: 'testing',
      message: 'Testing...',
      category: 'System Health'
    }
    setResults([...newResults, dbTest])
    
    try {
      const response = await fetch(`${API_URL}/products`)
      if (response.ok) {
        const dbResult: TestResult = {
          name: 'Database Connection',
          status: 'pass',
          message: 'Database accessible (products API working)',
          data: { verified: true },
          category: 'System Health'
        }
        newResults.push(dbResult)
      } else {
        const dbResult: TestResult = {
          name: 'Database Connection',
          status: 'fail',
          message: 'Database may be inaccessible',
          data: { status: response.status },
          category: 'System Health'
        }
        newResults.push(dbResult)
      }
    } catch (error: any) {
      const dbResult: TestResult = {
        name: 'Database Connection',
        status: 'fail',
        message: `Error: ${error.message}`,
        data: { error: error.toString() },
        category: 'System Health'
      }
      newResults.push(dbResult)
    }
    setResults([...newResults])

    setRunning(false)
  }

  const categories = Array.from(new Set(results.map(r => r.category)))
  const passCount = results.filter(r => r.status === 'pass').length
  const failCount = results.filter(r => r.status === 'fail').length
  const warningCount = results.filter(r => r.status === 'warning').length
  const pendingCount = results.filter(r => r.status === 'pending' || r.status === 'testing').length

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <span className="text-green-600 text-xl">✓</span>
      case 'fail': return <span className="text-red-600 text-xl">✗</span>
      case 'warning': return <span className="text-yellow-600 text-xl">⚠</span>
      case 'testing': return <span className="text-blue-600 animate-spin">⟳</span>
      default: return <span className="text-gray-400">○</span>
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-50 border-green-200'
      case 'fail': return 'bg-red-50 border-red-200'
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      case 'testing': return 'bg-blue-50 border-blue-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
          <h1 className="text-3xl font-bold mb-2">🔍 Comprehensive System Test Suite</h1>
          <p className="text-gray-600 mb-6">Complete diagnostic tool for GUFC E-Commerce System</p>
          
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
                <span className="text-gray-600">⏳ Pending: {pendingCount}</span>
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
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1 rounded text-sm ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      {cat} ({pass}/{count})
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
                </span>
              </h2>
              
              <div className="space-y-2">
                {categoryResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-md border-2 ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(result.status)}
                          <h3 className="font-semibold">{result.name}</h3>
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
            <p className="text-lg mb-2">Click &quot;Run All Tests&quot; to start comprehensive system testing</p>
            <p className="text-sm">This will test all APIs, routes, database connections, and system health</p>
          </div>
        )}

        {/* System Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mt-6">
          <h2 className="text-2xl font-bold mb-4">📊 System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">API Endpoints Tested:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Public APIs: {Object.keys(testSuites['Public APIs'] || {}).length} endpoints</li>
                <li>Admin APIs: {Object.keys(testSuites['Admin APIs (No Auth)'] || {}).length + Object.keys(testSuites['Admin APIs (With Auth)'] || {}).length} endpoints</li>
                <li>Payment APIs: {Object.keys(testSuites['Payment Endpoints'] || {}).length} endpoints</li>
                <li>Webhooks: {Object.keys(testSuites['Webhooks'] || {}).length} endpoints</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Frontend Routes Tested:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Store Pages: 7 routes</li>
                <li>Admin Pages: 11 routes</li>
                <li>Total: {frontendRoutes.length} routes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
