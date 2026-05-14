// Tahap 2: Visual Media
// User upload banner (landscape 21:9) dan poster/card (portrait 3:4) di sini

import { useRef } from 'react'
import { SectionCard, ImageUpload } from '../_components'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

interface Props {
  bannerFile: File | null
  cardFile: File | null
  drag: { banner: boolean; card: boolean }
  errors: Record<string, string | null>
  onFile: (key: 'banner' | 'card', file: File | null) => void
  onDragChange: (key: 'banner' | 'card', active: boolean) => void
  onDrop: (key: 'banner' | 'card', e: React.DragEvent) => void
  bannerRef: React.RefObject<HTMLInputElement>
  cardRef: React.RefObject<HTMLInputElement>
}

export function VisualsStage({
  bannerFile, cardFile, drag, errors,
  onFile, onDragChange, onDrop,
  bannerRef, cardRef,
}: Props) {
  // Bikin handler drag yang sesuai format yang diterima ImageUpload
  const makeDragHandler = (key: 'banner' | 'card') => ({
    onDrag: (e: React.DragEvent, active: boolean) => {
      e.preventDefault(); e.stopPropagation()
      onDragChange(key, active)
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation()
      onDrop(key, e)
    },
  })

  return (
    <div className="animate-in fade-in duration-500">
      <SectionCard title="Aset Media Visual">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">

          {/* Banner landscape — tampil di header event page */}
          <ImageUpload
            label="Event Banner (Desktop)*"
            file={bannerFile}
            isDragging={drag.banner}
            inputRef={bannerRef}
            onFile={f => onFile('banner', f)}
            emptyLabel="Upload banner (Rekomendasi 21:9)"
            className="h-44"
            error={errors.banner}
            {...makeDragHandler('banner')}
          />

          {/* Card/poster portrait — tampil di listing event */}
          <ImageUpload
            label="Event Poster (Portrait)*"
            file={cardFile}
            isDragging={drag.card}
            inputRef={cardRef}
            onFile={f => onFile('card', f)}
            emptyLabel="Upload poster (Rekomendasi 3:4)"
            className="w-36 h-48"
            error={errors.card}
            {...makeDragHandler('card')}
          />

        </div>
      </SectionCard>
    </div>
  )
}
