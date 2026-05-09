/**
 * Extracts the YouTube video ID from any standard YouTube URL.
 * Moved here from directus.ts - this is a pure string utility with no
 * relationship to the Directus data layer.
 */
export const getYouTubeID = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(
    /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  );
  return match && match[2].length === 11 ? match[2] : null;
};