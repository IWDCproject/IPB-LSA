/**
 * Shared utility to notify the public web app of data changes.
 */
export async function pingWebRevalidate(payload: { slug?: string; tags?: string[] }) {
  const webUrl = process.env.WEB_APP_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!webUrl || !secret) {
    console.warn('[revalidate] WEB_APP_URL or REVALIDATE_SECRET not set — web cache not busted');
    return;
  }

  try {
    const res = await fetch(`${webUrl}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': secret,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[revalidate] web app ping failed with status ${res.status}: ${text}`);
    }
  } catch (err: any) {
    console.error('[revalidate] web app ping failed:', err.message);
  }
}
