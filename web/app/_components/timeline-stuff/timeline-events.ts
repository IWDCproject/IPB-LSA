import { YEL, WHT } from "./timeline-canvas";

// --- Types ---------------------------------------------

export type SlotLayout = {
  co: { x: number; y: number };
  lo: { x: number; y: number };
  tilt: number;
  fy: number; fx: number; fd: number; fDl: number;
  subLabelOffset: { x: number; y: number };
};

export interface SlotColors {
  border: string;
  shadow: string | null;
  dot: string;
  glow: string;
  lc: string;
  lg: string;
  ds: number;
}

export interface RawEvent {
  id: string | number;
  status?: string;
  start_date?: string;
  end_date?: string;
  registration_end_date?: string;
  // id wajib ada biar getAssetUrl bisa resolve ke URL yang benar
  card_image?: { id: string; width?: number; height?: number } & Record<string, unknown>;
  [key: string]: unknown;
}

export interface ShapedEvent extends RawEvent {
  isPlaceholder: false;
  isActive: boolean;
  slot: SlotLayout & SlotColors;
  label: string;
  subLabel: string;
}

export interface PlaceholderEvent {
  id: string;
  isPlaceholder: true;
  isActive: false;
  slot: SlotLayout & SlotColors;
  label: string;
  subLabel: string;
}

export type TimelineEvent = ShapedEvent | PlaceholderEvent;

// --- Konstanta ---------------------------------------------

export const MAX_SLOTS = 4;

// co = card offset dari anchor, lo = label offset, tilt = rotasi kartu
// fy/fx/fd/fDl = amplitudo float Y/X, durasi, delay
export const SLOT_LAYOUTS: SlotLayout[] = [
  { co: { x: -255, y: -10  }, lo: { x:  22, y: -45 }, tilt:  9, fy: 20, fx:  12, fd: 5,   fDl: 0,   subLabelOffset: { x: 40, y: -10 } },
  { co: { x:    0, y: -330 }, lo: { x: -80, y:  22 }, tilt: -7, fy: 25, fx: -16, fd: 4,   fDl: 0.8, subLabelOffset: { x: 40, y: -10 } },
  { co: { x: -240, y:    0 }, lo: { x:  22, y: -60 }, tilt:  5, fy: 17, fx:  18, fd: 6,   fDl: 1.4, subLabelOffset: { x: 40, y: -10 } },
  { co: { x:    0, y: -335 }, lo: { x: -80, y:  20 }, tilt: -9, fy: 13, fx: -12, fd: 3.5, fDl: 0.3, subLabelOffset: { x: 40, y: -10 } },
];

const MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"] as const;
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;
const FINISHED_STATUSES = new Set(["finished","ended","past","done","complete","completed"]);

// --- Helpers ---------------------------------------------

export function getSlotColors(isActive: boolean): SlotColors {
  return isActive
    ? { border: YEL, shadow: "rgba(240,165,0,0.4)", dot: YEL, glow: YEL, lc: YEL, lg: "rgba(240,165,0,0.6)", ds: 25 }
    : { border: WHT, shadow: null, dot: WHT, glow: "rgba(255,255,255,0.4)", lc: WHT, lg: "rgba(255,255,255,0.3)", ds: 20 };
}

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase();
}

function ordinal(n: number): string {
  const v = n % 100;
  return n + (["th","st","nd","rd"][(v - 20) % 10] || ["th","st","nd","rd"][v] || "th");
}

function fmtRegDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${ordinal(d.getDate())} ${MONTHS_FULL[d.getMonth()]}`;
}

function fmtShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function getSubLabel(ev: RawEvent, isOngoing: boolean, isFinished: boolean): string {
  if (isOngoing) {
    const end = ev.end_date ? fmtRegDate(ev.end_date) : null;
    return end ? `Ends at\n${end}` : "Ongoing";
  }
  if (isFinished) {
    const at = ev.end_date ?? ev.start_date;
    return at ? `Ended at\n${fmtShort(at)}` : "Ended";
  }
  const regCloses = ev.registration_end_date ? new Date(ev.registration_end_date) : null;
  if (regCloses && regCloses > new Date()) return `Regist until\n${fmtRegDate(ev.registration_end_date!)}`;
  return "Coming Soon";
}

// Slot priority: ongoing > upcoming > finished (backfill)
// Urutan tampil di path: finished (lama) -> ongoing (sekarang) -> upcoming (nanti)
export function shapeEvents(rawEvents: RawEvent[] | null | undefined): TimelineEvent[] {
  const src = rawEvents ?? [];
  const now = new Date();

  const isActive   = (ev: RawEvent) => ev.status === "active" || ev.status === "live";
  // Finished kalau status-nya masuk daftar, ATAU tanggal end/start sudah lewat
  const isFinished = (ev: RawEvent) => {
    if (FINISHED_STATUSES.has((ev.status ?? "").toLowerCase())) return true;
    const endDate = ev.end_date ? new Date(ev.end_date) : ev.start_date ? new Date(ev.start_date) : null;
    return !isActive(ev) && endDate !== null && endDate < now;
  };

  const active   = src.filter(isActive);
  const upcoming = src.filter((ev) => !isActive(ev) && !isFinished(ev));
  const finished = src.filter(isFinished);

  const remaining      = Math.max(0, MAX_SLOTS - active.length);
  const pickedUpcoming = upcoming.slice(0, remaining);
  const pickedFinished = finished.slice(0, Math.max(0, remaining - pickedUpcoming.length));

  const filled = [...pickedFinished, ...active, ...pickedUpcoming].slice(0, MAX_SLOTS);
  const padded: (RawEvent | null)[] = [...filled, ...Array(MAX_SLOTS - filled.length).fill(null)];

  const lastActiveIdx = padded.reduce<number>((acc, ev, i) => (ev && isActive(ev) ? i : acc), -1);

  return padded.map((ev, i) => {
    const slotLayout = SLOT_LAYOUTS[i];
    const evIsActive = lastActiveIdx !== -1 && i <= lastActiveIdx;

    if (!ev) {
      return {
        id: `placeholder-${i}`,
        isPlaceholder: true as const,
        isActive: false as const,
        slot: { ...slotLayout, ...getSlotColors(false) },
        label: "TBA",
        subLabel: "Coming Soon",
      };
    }

    const evIsFinished = isFinished(ev);
    return {
      ...ev,
      isPlaceholder: false as const,
      slot: { ...slotLayout, ...getSlotColors(evIsActive) },
      isActive: evIsActive,
      label: evIsActive ? "ONGOING" : (ev.start_date ? formatDateLabel(ev.start_date) : "TBA"),
      subLabel: getSubLabel(ev, evIsActive, evIsFinished),
    };
  });
}