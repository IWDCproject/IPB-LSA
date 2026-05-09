// Shared TypeScript types for the News page component tree.

export type EventStatus = "upcoming" | "ongoing" | "concluded";
export type SortValue   = "-published_at" | "published_at";

export interface EventOption {
  id:     string;
  name:   string;
  slug:   string;
  status: EventStatus;
}

export interface NewsItem {
  id:               string;
  title:            string;
  slug:             string;
  excerpt:          string | null;
  thumbnail_url:    string | null;
  thumbnail_width:  number | null;
  thumbnail_height: number | null;
  category:         string;
  published_at:     string;
  event_id:         { name: string; slug?: string } | null;
}

export interface EventWithNews {
  id:           string;
  name:         string;
  slug:         string;
  status:       EventStatus;
  banner_image: { id: string } | null;
  banner_url:   string | null;
  news:         NewsItem[];
}

// Directus filter shape for news queries - narrow enough to prevent mistakes.
export interface DirectusNewsFilter {
  is_published:  { _eq: true };
  title?:        { _icontains: string };
  event_id?:     { status?: { _in: string[] }; slug?: { _in: string[] } };
}

// --- Data-fetching contract types ---------------------------------------------
// Explicit in/out shapes for getAllNewsFiltered so the UI component and the
// directus module stay in sync without either side inspecting the other's
// internals.  Update both if the API contract changes.

export interface GetAllNewsParams {
  page?:     number;
  pageSize?: number;
  filter?:   DirectusNewsFilter;
  sort?:     SortValue;
}

export interface GetAllNewsResult {
  items:      NewsItem[];
  total:      number;
  totalPages: number;
}