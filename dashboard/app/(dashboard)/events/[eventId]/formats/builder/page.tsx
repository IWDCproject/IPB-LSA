import { Suspense } from 'react'
import FormatBuilderPage from './FormatBuilderPage'

export default function Page() {
  return (
    <Suspense>
      <FormatBuilderPage />
    </Suspense>
  )
}