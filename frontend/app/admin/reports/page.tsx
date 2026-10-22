'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface OrderItem {
  id: number
  product_name: string
  variant_name?: string
  quantity: number
  unit_price: number
  total_price: number
}

interface OrderRow {
  id: number
  order_number: string
  guest_name: string
  guest_email: string
  guest_phone: string
  shipping_city?: string | null
  shipping_country?: string | null
  payment_ref?: string | null
  subtotal: number
  discount_amount: number
  vat_amount: number
  total_amount: number
  currency: string
  payment_method: string
  payment_status?: string
  status?: string
  created_at: string
  items: OrderItem[]
}

interface SummaryByCurrency {
  [currency: string]: {
    subtotal: number
    discount: number
    vat: number
    total: number
  }
}

interface ReportSummary {
  count: number
  by_currency: SummaryByCurrency
  totals_pkr: {
    subtotal: number
    discount: number
    vat: number
    total: number
  }
}

interface ReportResponse {
  filters: {
    from: string
    to: string
  }
  results: OrderRow[]
  summary: ReportSummary
}

export default function AdminReportsPage() {
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ReportResponse | null>(null)

  // Visual settings from API
  const [visualSettings, setVisualSettings] = useState<{
    products_bg_image_url: string
    products_bg_contrast?: number
    products_bg_saturation?: number
    products_bg_brightness?: number
  } | null>(null)

  // Default background image
  const defaultHeroBgImage = '' // Removed hardcoded image - wait for API response

  useEffect(() => {
    const fetchVisualSettings = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
        const response = await fetch(`${apiUrl}/settings/visual`)
        if (response.ok) {
          const data = await response.json()
          setVisualSettings({
            products_bg_image_url: data.products_bg_image_url || '',
            products_bg_contrast: parseFloat(data.products_bg_contrast) || 1,
            products_bg_saturation: parseFloat(data.products_bg_saturation) || 1,
            products_bg_brightness: parseFloat(data.products_bg_brightness) || 0.7,
          })
        }
      } catch {
        // silent fail – will use default image
      }
    }
    
    fetchVisualSettings()
  }, [])

  // Initialise with last 30 days
  useEffect(() => {
    const today = new Date()
    const toStr = today.toISOString().slice(0, 10)
    const fromDate = new Date()
    fromDate.setDate(today.getDate() - 30)
    const fromStr = fromDate.toISOString().slice(0, 10)
    setFrom(fromStr)
    setTo(toStr)
  }, [])

  useEffect(() => {
    if (from && to) {
      fetchReport()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://secrets.gatvia.com/api'
      const params = new URLSearchParams({ from, to })
      const response = await fetch(`${apiUrl}/admin/reports/orders?${params.toString()}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
        }
        toast.error(errorData.error || `Failed to load report (${response.status})`)
        setReport(null)
        return
      }

      let data: ReportResponse | null = null
      try {
        data = (await response.json()) as ReportResponse
      } catch (parseError) {
        console.error('Failed to parse report response:', parseError)
        toast.error('Invalid response from server. Please try again.')
        setReport(null)
        return
      }

      setReport(data)
    } catch (error: any) {
      console.error('Error loading report', error)
      toast.error('Error loading report')
    } finally {
      setLoading(false)
    }
  }

  const toNumber = (value: any): number => {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const n = parseFloat(value.replace(/,/g, ''))
      return Number.isNaN(n) ? 0 : n
    }
    return 0
  }

  const formatCurrency = (amount: any, currency: string) => {
    const n = toNumber(amount)
    return `${currency} ${n.toFixed(2)}`
  }

  const formatProducts = (items: OrderItem[]): string => {
    if (!items?.length) return ''
    return items
      .map((item) => {
        const name = item.variant_name
          ? `${item.product_name} (${item.variant_name})`
          : item.product_name
        return item.quantity > 1 ? `${name} ×${item.quantity}` : name
      })
      .join('; ')
  }

  const handleDownloadCsv = () => {
    if (!report) return

    const rows: string[] = []
    rows.push([
      'Order Number',
      'Payment Ref No.',
      'Date',
      'Customer',
      'Shipping City',
      'Product/s',
      'Email',
      'Phone',
      'Payment Method',
      'Currency',
      'Subtotal',
      'Discount',
      'VAT',
      'Total',
    ].join(','))

    report.results.forEach((order) => {
      rows.push([
        order.order_number,
        order.payment_ref ?? '',
        order.created_at,
        order.guest_name,
        order.shipping_city ?? '',
        formatProducts(order.items),
        order.guest_email,
        order.guest_phone,
        order.payment_method,
        order.currency,
        toNumber(order.subtotal).toFixed(2),
        toNumber(order.discount_amount || 0).toFixed(2),
        toNumber(order.vat_amount).toFixed(2),
        toNumber(order.total_amount).toFixed(2),
      ].map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','))
    })

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `gufc-orders-${from}-to-${to}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  // Use API image if available, otherwise use default
  const productsBgImage = visualSettings?.products_bg_image_url || defaultHeroBgImage
  // Build filter CSS string from settings
  const productsBgFilter = `contrast(${visualSettings?.products_bg_contrast ?? 1}) saturate(${visualSettings?.products_bg_saturation ?? 1}) brightness(${visualSettings?.products_bg_brightness ?? 0.7})`

  return (
    <>
      {/* Print-specific styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          /* Hide admin layout sidebar and header */
          [data-admin-layout] > aside,
          [data-admin-layout] > header,
          [data-admin-layout] > nav {
            display: none !important;
          }
          
          /* Hide background images and overlays */
          [data-admin-layout] > div[style*="backgroundImage"],
          [data-admin-layout] > div[style*="background-image"] {
            display: none !important;
          }
          
          /* Hide all background elements */
          body > div > div[style*="backgroundImage"],
          body > div > div[style*="background-image"],
          body > div > div.fixed {
            display: none !important;
          }
          
          /* Reset page styling for print */
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            font-size: 10px !important;
          }
          
          /* Show only the reports content container */
          .print-content {
            position: static !important;
            background: white !important;
            padding: 5mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            z-index: 1 !important;
            width: 100% !important;
            max-width: 100% !important;
            font-size: 9px !important;
          }
          
          /* Hide non-essential elements */
          .print\\:hidden {
            display: none !important;
          }
          
          /* Ensure text is readable */
          .print-content * {
            color: #000 !important;
          }
          
          /* Show print title only in print */
          .print-title {
            display: block !important;
            margin-bottom: 8px !important;
            page-break-after: avoid !important;
          }
          
          .print-title h1 {
            font-size: 16px !important;
            margin: 0 0 4px 0 !important;
          }
          
          .print-title p {
            font-size: 10px !important;
            margin: 0 !important;
          }
          
          /* Summary cards for print - make compact */
          .print-content [class*="md:rounded"] {
            border-radius: 0 !important;
            border: 1px solid #ddd !important;
            margin-bottom: 3px !important;
            padding: 5px !important;
            page-break-inside: avoid !important;
          }
          
          .print-content [class*="md:rounded"] h2 {
            font-size: 8px !important;
            margin: 0 0 2px 0 !important;
            font-weight: 600 !important;
          }
          
          .print-content [class*="md:rounded"] p {
            font-size: 10px !important;
            margin: 1px 0 !important;
          }
          
          .print-content [class*="md:rounded"] dl {
            font-size: 7px !important;
            margin: 0 !important;
          }
          
          .print-content [class*="md:rounded"] dt,
          .print-content [class*="md:rounded"] dd {
            font-size: 7px !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Make summary grid more compact - single row */
          .print-content .grid {
            gap: 3px !important;
            margin-bottom: 5px !important;
            grid-template-columns: repeat(3, 1fr) !important;
          }
          
          /* Reduce spacing in summary cards */
          .print-content .space-y-1 > * {
            margin-top: 1px !important;
            margin-bottom: 1px !important;
          }
          
          /* Table styling for print - compact */
          .print-content table {
            border-collapse: collapse !important;
            width: 100% !important;
            page-break-inside: auto !important;
            font-size: 8px !important;
            margin: 0 !important;
          }
          
          .print-content th, .print-content td {
            border: 1px solid #ddd !important;
            padding: 3px 4px !important;
            font-size: 8px !important;
            line-height: 1.2 !important;
          }
          
          .print-content th {
            background: #f5f5f5 !important;
            font-weight: bold !important;
            font-size: 7px !important;
            text-transform: uppercase !important;
          }
          
          /* Compact table cells - reduce column widths */
          .print-content td {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 60px !important;
          }
          
          /* Date column */
          .print-content td:nth-child(1) { max-width: 70px !important; font-size: 7px !important; }
          /* Order # column */
          .print-content td:nth-child(2) { max-width: 80px !important; font-size: 7px !important; }
          /* Payment Ref No. column */
          .print-content td:nth-child(3) { max-width: 80px !important; font-size: 7px !important; }
          /* Customer column */
          .print-content td:nth-child(4) { max-width: 100px !important; white-space: normal !important; font-size: 7px !important; }
          .print-content td:nth-child(4) > div { font-size: 7px !important; line-height: 1.1 !important; }
          /* Shipping City column */
          .print-content td:nth-child(5) { max-width: 80px !important; font-size: 7px !important; }
          /* Products column */
          .print-content td:nth-child(6) { max-width: 120px !important; white-space: normal !important; font-size: 7px !important; }
          /* Payment column */
          .print-content td:nth-child(7) { max-width: 70px !important; white-space: normal !important; font-size: 7px !important; }
          /* Price columns */
          .print-content td:nth-child(8),
          .print-content td:nth-child(9),
          .print-content td:nth-child(10),
          .print-content td:nth-child(11) { max-width: 50px !important; font-size: 7px !important; }
          
          .print-content th:nth-child(1) { max-width: 70px !important; }
          .print-content th:nth-child(2) { max-width: 80px !important; }
          .print-content th:nth-child(3) { max-width: 80px !important; }
          .print-content th:nth-child(4) { max-width: 100px !important; }
          .print-content th:nth-child(5) { max-width: 80px !important; }
          .print-content th:nth-child(6) { max-width: 120px !important; }
          .print-content th:nth-child(7) { max-width: 70px !important; }
          .print-content th:nth-child(8),
          .print-content th:nth-child(9),
          .print-content th:nth-child(10),
          .print-content th:nth-child(11) { max-width: 50px !important; }
          
          /* Remove badges styling in print - make text only */
          .print-content .rounded-full {
            border-radius: 0 !important;
            padding: 1px 3px !important;
            font-size: 7px !important;
            display: inline !important;
            border: none !important;
            background: transparent !important;
            color: #000 !important;
          }
          
          /* Ensure no page breaks in summary */
          .print-content .mb-6:first-of-type {
            page-break-after: avoid !important;
          }
        }
      `}} />
      
      <div className="min-h-screen bg-gray-900 text-white antialiased overflow-x-hidden relative" style={{ paddingTop: '3%' }}>
        {/* Full-screen background image */}
        <div 
          className="fixed top-0 left-0 w-full h-screen overflow-hidden print:hidden"
          style={{
          ...(productsBgImage ? {
            backgroundImage: `url(${productsBgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: productsBgFilter,
          } : {}),
          zIndex: 0,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 via-[#003366]/30 to-gray-900/60"></div>
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(220, 20, 60, 0.15) 0%, rgba(0, 51, 102, 0.15) 100%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/25 via-gray-900/15 to-gray-900/25"></div>
        </div>
        <div className="relative print-content" style={{ zIndex: 1 }}>
        <div className="md:rounded-[40px] md:p-8 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-8 pr-8 pb-8 pl-8 backdrop-blur-3xl print:bg-white print:border-0 print:rounded-none print:shadow-none">
          {/* Print Title - hidden on screen, shown in print */}
          <div className="hidden print-title">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Financial & VAT Reports</h1>
            {report && (
              <p className="text-sm text-gray-600">
                Period: {report.filters.from} to {report.filters.to}
              </p>
            )}
          </div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Financial &amp; VAT Reports</h1>
        <div className="space-x-2">
          <button
            onClick={handleDownloadCsv}
            disabled={!report}
            className="px-4 py-2 bg-gradient-to-r from-[#003366] to-[#004080] text-white rounded-md text-sm hover:from-[#004080] hover:to-[#003366] transition-all duration-300 disabled:opacity-50"
          >
            Download CSV (Excel)
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-stone-700/50 text-white rounded-md text-sm hover:bg-stone-700 border border-stone-600 hover:border-stone-500 transition-all"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-stone-700/30 rounded-lg border border-stone-600/50 p-6 print:hidden">
        <h2 className="text-lg font-semibold text-white mb-3">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-md text-white focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-all"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={fetchReport}
              className="px-4 py-2 bg-gradient-to-r from-[#DC143C] to-[#b01030] text-white rounded-md text-sm hover:from-[#b01030] hover:to-[#DC143C] transition-all duration-300 font-semibold"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DC143C] mx-auto"></div>
            <p className="mt-2 text-stone-300 text-sm">Loading report...</p>
          </div>
        </div>
      )}

      {!loading && report && (
        <>
          {/* Summary section */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl print:bg-white print:border print:border-gray-200">
              <h2 className="text-sm font-semibold text-stone-300 mb-1 print:text-gray-600">Total Orders</h2>
              <p className="text-2xl font-bold text-white print:text-gray-900">{report.summary.count}</p>
              <p className="text-xs text-stone-400 mt-1 print:text-gray-500">
                Period: {report.filters.from} to {report.filters.to}
              </p>
            </div>
            <div className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl print:bg-white print:border print:border-gray-200">
              <h2 className="text-sm font-semibold text-stone-300 mb-1 print:text-gray-600">Totals (PKR)</h2>
              <p className="text-xs text-stone-400 mb-1 print:text-gray-500">Converted to PKR for reporting</p>
              <dl className="text-xs text-stone-200 space-y-1 print:text-gray-700">
                <div className="flex justify-between">
                  <dt>Net Sales (Subtotal - Discount)</dt>
                  <dd>
                    {formatCurrency(
                      report.summary.totals_pkr.subtotal - report.summary.totals_pkr.discount,
                      'PKR',
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>VAT (Output Tax)</dt>
                  <dd>{formatCurrency(report.summary.totals_pkr.vat, 'PKR')}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>Gross Sales (Incl. VAT)</dt>
                  <dd>{formatCurrency(report.summary.totals_pkr.total, 'PKR')}</dd>
                </div>
              </dl>
            </div>
            <div className="md:rounded-[40px] md:p-6 overflow-hidden bg-stone-800/50 border-stone-700/50 border rounded-b-3xl pt-6 pr-6 pb-6 pl-6 backdrop-blur-3xl print:bg-white print:border print:border-gray-200">
              <h2 className="text-sm font-semibold text-stone-300 mb-1 print:text-gray-600">By Currency</h2>
              <div className="space-y-1 text-xs text-stone-200 max-h-28 overflow-auto print:text-gray-700">
                {Object.entries(report.summary.by_currency).map(([cur, s]) => (
                  <div key={cur} className="flex justify-between">
                    <span>{cur}</span>
                    <span>
                      {formatCurrency(s.total, cur)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed table */}
          <div className="bg-stone-700/30 rounded-lg border border-stone-600/50 overflow-x-auto print:bg-white print:border print:border-gray-200 print:overflow-visible">
            <table className="min-w-full text-xs print:text-[8px]">
              <thead className="bg-stone-800/50 print:bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-stone-300 print:text-gray-500">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-300 print:text-gray-500">Order #</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-300 print:text-gray-500">Payment Ref No.</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-300 print:text-gray-500">Customer</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-300 print:text-gray-500">Shipping City</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-300 print:text-gray-500">Product/s</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-300 print:text-gray-500">Payment</th>
                  <th className="px-3 py-2 text-right font-medium text-stone-300 print:text-gray-500">Subtotal</th>
                  <th className="px-3 py-2 text-right font-medium text-stone-300 print:text-gray-500">Discount</th>
                  <th className="px-3 py-2 text-right font-medium text-stone-300 print:text-gray-500">VAT</th>
                  <th className="px-3 py-2 text-right font-medium text-stone-300 print:text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-700/50 print:divide-gray-100">
                {report.results.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-700/40 print:hover:bg-transparent">
                    <td className="px-3 py-2 whitespace-nowrap text-stone-300 print:text-gray-600">
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-white print:text-gray-900">
                      {order.order_number}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-stone-300 print:text-gray-600 text-[10px]">
                      {order.payment_ref || '—'}
                    </td>
                    <td className="px-3 py-2 text-stone-200 print:text-gray-700">
                      <div className="font-medium">{order.guest_name}</div>
                      <div className="text-[10px] text-stone-400 print:text-gray-500">{order.guest_email}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-stone-200 print:text-gray-700">
                      {order.shipping_city || '—'}
                    </td>
                    <td className="px-3 py-2 text-stone-200 print:text-gray-700 max-w-[200px]">
                      <div className="text-[10px] leading-snug whitespace-normal">
                        {formatProducts(order.items) || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-stone-200 print:text-gray-700">
                      <div className={`capitalize inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        order.payment_method === 'stripe' || order.payment_method === 'apple_pay'
                          ? 'bg-[#DC143C]/20 text-[#DC143C] border border-[#DC143C]/30'
                          : order.payment_method === 'bank_transfer'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-stone-600/20 text-stone-300 border border-stone-600/30'
                      }`}>
                        {order.payment_method.replace('_', ' ')}
                      </div>
                      {order.payment_status && (
                        <div className={`mt-1 inline-block px-2 py-1 rounded-full text-[10px] font-medium ${
                          order.payment_status === 'completed'
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : order.payment_status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            : 'bg-[#DC143C]/20 text-[#DC143C] border border-[#DC143C]/30'
                        }`}>
                          {order.payment_status}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-stone-200 print:text-gray-700">
                      {formatCurrency(order.subtotal, order.currency)}
                    </td>
                    <td className="px-3 py-2 text-right text-stone-200 print:text-gray-700">
                      {formatCurrency(order.discount_amount || 0, order.currency)}
                    </td>
                    <td className="px-3 py-2 text-right text-stone-200 print:text-gray-700">
                      {formatCurrency(order.vat_amount, order.currency)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-white print:text-gray-900">
                      {formatCurrency(order.total_amount, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && !report && (
        <div className="text-center text-stone-300 text-sm mt-8">
          Select a date range and click Refresh to view reports.
        </div>
      )}
    </div>
      </div>
      </div>
    </>
  )
}






