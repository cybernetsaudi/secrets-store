import type { Metadata } from 'next'
import InfoPage from '@/components/InfoPage'
import { INFO_PAGES } from '@/lib/infoPages'

const content = INFO_PAGES.sustainability

export const metadata: Metadata = {
  title: `${content.title} | GATVIA Secrets`,
  description: content.subtitle,
}

export default function SustainabilityPage() {
  return <InfoPage content={content} />
}
