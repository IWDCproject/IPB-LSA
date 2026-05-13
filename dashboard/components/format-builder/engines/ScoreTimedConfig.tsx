import { useFormatBuilder } from '@/stores/formatBuilder'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ScoreTimedConfig() {
  const { engine, setEngine } = useFormatBuilder()

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Label Skor</Label>
        <Input
          value={engine.scoreLabel}
          onChange={(e) => setEngine({ scoreLabel: e.target.value })}
          placeholder="contoh: Poin, Gol, Nilai"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="has-periods"
          type="checkbox"
          className="h-4 w-4 rounded border-zinc-300"
          checked={engine.hasPeriods}
          onChange={(e) => setEngine({ hasPeriods: e.target.checked })}
        />
        <Label htmlFor="has-periods">Pakai babak/periode</Label>
      </div>

      {engine.hasPeriods && (
        <div className="grid grid-cols-2 gap-4 pl-6">
          <div className="space-y-1.5">
            <Label>Nama Babak</Label>
            <Input
              value={engine.periodTerm}
              onChange={(e) => setEngine({ periodTerm: e.target.value })}
              placeholder="contoh: Babak, Ronde, Quarter"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Jumlah Babak</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={engine.periodCount}
              onChange={(e) => setEngine({ periodCount: Number(e.target.value) })}
            />
          </div>
        </div>
      )}
    </div>
  )
}