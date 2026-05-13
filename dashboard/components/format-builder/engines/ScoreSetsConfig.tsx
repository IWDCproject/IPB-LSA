import { useFormatBuilder } from '@/stores/formatBuilder'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ScoreSetsConfig() {
  const { engine, setEngine } = useFormatBuilder()

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Label Skor</Label>
        <Input
          value={engine.scoreLabel}
          onChange={(e) => setEngine({ scoreLabel: e.target.value })}
          placeholder="contoh: Poin, Angka"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Nama Set</Label>
        <Input
          value={engine.setTerm}
          onChange={(e) => setEngine({ setTerm: e.target.value })}
          placeholder="contoh: Set, Game, Leg"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Maks. Set</Label>
          <Input
            type="number"
            min={1}
            max={99}
            value={engine.maxSets}
            onChange={(e) => setEngine({ maxSets: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Set untuk Menang</Label>
          <Input
            type="number"
            min={1}
            max={engine.maxSets}
            value={engine.setsToWin}
            onChange={(e) => setEngine({ setsToWin: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  )
}