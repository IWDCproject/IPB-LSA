// Tipe data untuk satu tahap/fase event
export type Phase = {
  id: string
  label: string
  date_start: string
  time_start: string
  status?: string        // upcoming | ongoing | done
  description?: string   // opsional, detail fase
}

// Tipe data form utama
export type EventForm = {
  name: string
  slug: string
  type: string
  location: string
  description: string
  start_date: string
  end_date: string
  
  // Registration & Links
  registration_url: string
  guidebook_url: string
  website_url: string
  instagram_url: string
  url_youtube: string

  // Contact Person (Simplified for Wizard)
  contact_person_name: string
  contact_person_email: string
  contact_person_link: string
}
