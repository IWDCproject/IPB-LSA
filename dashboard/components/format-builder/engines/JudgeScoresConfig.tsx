import { useFormatBuilder } from '@/stores/formatBuilder'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ScoringMethod } from '@/types/directus'

// --- Konstanta -------------------------------------------------

const METHOD_LABEL: Record<ScoringMethod, string> = {
  avg:           'Rata-rata',
  sum:           'Total',
  drop_extremes: 'Buang Tertinggi & Terendah',
}

// --- Komponen utama --------------------------------------------

export function JudgeScoresConfig() {
  const { engine, setEngine } = useFormatBuilder()

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Jumlah Juri</Label>
        <Input
          type="number"
          min={1}
          max={20}
          value={engine.numJudges}
          onChange={(e) => setEngine({ numJudges: Number(e.target.value) })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Skor Min</Label>
          <Input
            type="number"
            value={engine.scoreMin}
            onChange={(e) => setEngine({ scoreMin: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Skor Maks</Label>
          <Input
            type="number"
            value={engine.scoreMax}
            onChange={(e) => setEngine({ scoreMax: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Step</Label>
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={engine.step}
            onChange={(e) => setEngine({ step: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Metode Kalkulasi</Label>
        <Select
          value={engine.method}
          onValueChange={(val) => setEngine({ method: val as ScoringMethod })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(METHOD_LABEL) as ScoringMethod[]).map((m) => (
              <SelectItem key={m} value={m}>
                {METHOD_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}