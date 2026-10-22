import type { Metadata } from 'next'
import InfoPage from '@/components/InfoPage'
import { INFO_PAGES } from '@/lib/infoPages'

const content = INFO_PAGES['payment-options']

export const metadata: Metadata = {
  title: `${content.title} | GATVIA Secrets`,
  description: content.subtitle,
}

export default function PaymentOptionsPage() {
  return <InfoPage content={content} />
}
