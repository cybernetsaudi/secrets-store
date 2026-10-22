'use client'

import Link from 'next/link'
import { COLLECTION_LIST, collectionProductsUrl } from '@/lib/collections'

export default function Footer() {
  return (
    <footer className="theme-footer pt-16 pb-8">
      <div className="px-6 lg:px-12 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-16">
        {/* Important Links */}
        <div className="col-span-1 md:col-span-2">
          <ul className="space-y-3 text-xs font-bold uppercase tracking-wide">
            <li>
              <Link href="/products/" className="cursor-pointer hover:text-gray-400">
                Find A Store
              </Link>
            </li>
            <li>
              <Link href="/products/" className="cursor-pointer hover:text-gray-400">
                Become A Member
              </Link>
            </li>
            <li>
              <Link href="mailto:secrets@gatvia.com" className="cursor-pointer hover:text-gray-400">
                Send Us Feedback
              </Link>
            </li>
            <li>
              <Link href="/products/" className="cursor-pointer hover:text-gray-400">
                Student Discounts
              </Link>
            </li>
          </ul>
        </div>

        {/* Help */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide mb-4 text-gray-400">Get Help</h4>
          <ul className="space-y-3 text-xs text-gray-400">
            <li>
              <Link href="/order-status/" className="cursor-pointer hover:text-white">
                Order Status
              </Link>
            </li>
            <li>
              <Link href="/delivery/" className="cursor-pointer hover:text-white">
                Delivery
              </Link>
            </li>
            <li>
              <Link href="/returns/" className="cursor-pointer hover:text-white">
                Returns
              </Link>
            </li>
            <li>
              <Link href="/payment-options/" className="cursor-pointer hover:text-white">
                Payment Options
              </Link>
            </li>
          </ul>
        </div>

        {/* Collections */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide mb-4 text-gray-400">Collections</h4>
          <ul className="space-y-3 text-xs text-gray-400">
            {COLLECTION_LIST.map((c) => (
              <li key={c.id}>
                <Link href={collectionProductsUrl(c.id)} className="cursor-pointer hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* About */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide mb-4 text-gray-400">About GATVIA</h4>
          <ul className="space-y-3 text-xs text-gray-400">
            <li>
              <Link href="/news/" className="cursor-pointer hover:text-white">
                News
              </Link>
            </li>
            <li>
              <Link href="/careers/" className="cursor-pointer hover:text-white">
                Careers
              </Link>
            </li>
            <li>
              <Link href="/investors/" className="cursor-pointer hover:text-white">
                Investors
              </Link>
            </li>
            <li>
              <Link href="/sustainability/" className="cursor-pointer hover:text-white">
                Sustainability
              </Link>
            </li>
          </ul>
        </div>

        {/* Socials */}
        <div className="md:col-span-2 lg:col-span-2 lg:flex lg:justify-end items-start gap-4">
          <button className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
            </svg>
          </button>
          <button className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
            </svg>
          </button>
          <button className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"></path>
              <path d="m10 15 5-3-5-3z"></path>
            </svg>
          </button>
          <button className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Sub Footer */}
      <div className="px-6 lg:px-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center">
          <div className="flex items-center gap-2 text-xs text-white cursor-pointer">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3"
            >
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>UAE</span>
          </div>
          <span className="text-xs text-gray-500">© 2024 GatviaPK, Inc. All Rights Reserved</span>
        </div>
        <div className="flex flex-wrap gap-4 md:gap-6 text-xs text-gray-500">
          <Link href="/guides/" className="hover:text-white">Guides</Link>
          <Link href="/terms-of-sale/" className="hover:text-white">Terms of Sale</Link>
          <Link href="/terms-of-use/" className="hover:text-white">Terms of Use</Link>
          <Link href="/privacy-policy/" className="hover:text-white">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  )
}
