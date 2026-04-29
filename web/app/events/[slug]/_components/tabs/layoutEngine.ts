// layoutEngine.ts
const Tolerance = 0.3;

export interface LayoutPanelData {
  baseH: number;
  items: { height: number; isLive: boolean }[];
}

export function calculateGreedyLayout(
  availH: number, upcoming: LayoutPanelData | null, latest: LayoutPanelData | null, panelGap: number, footerH: number
) {
  if (availH <= 0) return { upCount: -1, lateCount: -1 };

  const flexTotal = (upcoming ? 3 : 0) + (latest ? 2 : 0);
  let availUp = upcoming ? (availH - (latest ? panelGap : 0)) * 3 / flexTotal : 0;
  let availLate = latest ? (availH - (upcoming ? panelGap : 0)) * 2 / flexTotal : 0;

  const processPanel = (data: LayoutPanelData, maxH: number) => {
    let used = data.baseH;
    let count = 0;
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const isLast = i === data.items.length - 1;
      const needed = used + item.height + (isLast ? 0 : footerH);
      if (needed <= maxH || count === 0) { 
        used += item.height; 
        count++; 
      } else break;
    }
    return { count, rem: maxH - (used + (count < data.items.length ? footerH : 0)) };
  };

  let upRes = upcoming ? processPanel(upcoming, availUp) : { count: 0, rem: 0 };
  let lateRes = latest ? processPanel(latest, availLate) : { count: 0, rem: 0 };

  let totalRem = Math.max(0, upRes.rem) + Math.max(0, lateRes.rem);
  const nextUp = upcoming && upRes.count < upcoming.items.length ? upcoming.items[upRes.count] : null;
  const nextLate = latest && lateRes.count < latest.items.length ? latest.items[lateRes.count] : null;

  let candidate = nextUp?.isLive ? { type: 'up', h: nextUp.height } 
    : nextUp ? { type: 'up', h: nextUp.height } 
    : nextLate ? { type: 'late', h: nextLate.height } : null;

  if (candidate) {
    const isLast = candidate.type === 'up' ? upRes.count === upcoming!.items.length - 1 : lateRes.count === latest!.items.length - 1;
    const addedCost = candidate.h - (isLast ? footerH : 0);
    if (totalRem >= addedCost || totalRem > addedCost * Tolerance) {
      if (candidate.type === 'up') upRes.count++; else lateRes.count++;
    }
  }

  return { upCount: upRes.count, lateCount: lateRes.count };
}