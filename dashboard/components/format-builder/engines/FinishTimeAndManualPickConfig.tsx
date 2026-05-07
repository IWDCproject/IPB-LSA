import { useFormatBuilder } from '@/stores/formatBuilder'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

// --- FinishTimeConfig ------------------------------------------

export function FinishTimeConfig() {
  const { engine, setEngine } = useFormatBuilder()

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Satuan Waktu</Label>
        <Select
          value={engine.unit}
          onValueChange={(val) => setEngine({ unit: val as 's' | 'ms' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="s">Detik (s)</SelectItem>
            <SelectItem value="ms">Milidetik (ms)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Urutan Ranking</Label>
        <Select
          value={engine.rankOrder}
          onValueChange={(val) => setEngine({ rankOrder: val as 'asc' | 'desc' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Tercepat menang (asc)</SelectItem>
            <SelectItem value="desc">Terlama menang (desc)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// --- ManualPickConfig ------------------------------------------

export function ManualPickConfig() {
  const { engine, matchType, setEngine } = useFormatBuilder()

  return (
    <div className="space-y-4">
      {matchType === 'head_to_head' && (
        <div className="flex items-center gap-2">
          <input
            id="allow-draw"
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300"
            checked={engine.allowDraw}
            onChange={(e) => setEngine({ allowDraw: e.target.checked })}
          />
          <Label htmlFor="allow-draw">Izinkan seri</Label>
        </div>
      )}

      {matchType === 'open' && (
        <>
          <div className="space-y-1.5">
            <Label>Jumlah Pemenang (Top N)</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={engine.topN}
              onChange={(e) => setEngine({ topN: Number(e.target.value) })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="ranked-order"
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300"
              checked={engine.rankedOrder}
              onChange={(e) => setEngine({ rankedOrder: e.target.checked })}
            />
            <Label htmlFor="ranked-order">Tampilkan urutan ranking</Label>
          </div>
        </>
      )}
    </div>
  )
}
