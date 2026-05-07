import { Suspense } from 'react'
import FormatBuilderPage from '@/components/format-builder/FormatBuilderPage'

export default function Page() {
  return (
    <Suspense>
      <FormatBuilderPage />
    </Suspense>
  )
}