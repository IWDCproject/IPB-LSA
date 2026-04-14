/**
 * Konfigurasi sinkronisasi data untuk Custom Collections IPB-LSA
 */
export const syncCustomCollections = {
	activity_logs: { watch: ['activity_logs.items'] },
	app_settings: { watch: ['app_settings.items'] },
	competition_categories: { watch: ['competition_categories.items'] },
	event_phases: { watch: ['event_phases.items'] },
	events: { watch: ['events.items'] },
	institutions: { watch: ['institutions.items'] },
	match_formats: { watch: ['match_formats.items'] },
	match_participants: { watch: ['match_participants.items'] },
	matches: { watch: ['matches.items'] },
	news: { watch: ['news.items'] },
	participants: { watch: ['participants.items'] },
	sponsors: { watch: ['sponsors.items'] }
};