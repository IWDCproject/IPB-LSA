import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse('Missing file ID', { status: 400 });
  }

  try {
    // A server-side fetch bypasses the browser's CORS and CORP restrictions
    const response = await fetch(`https://drive.google.com/thumbnail?id=${id}&sz=w1600`);
    
    if (!response.ok) {
      throw new Error(`Google returned ${response.status}`);
    }

    // Pass the image buffer directly to the client
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        // Cache the image heavily so we don't spam Google's servers
        'Cache-Control': 'public, max-age=86400, s-maxage=31536000',
      },
    });
  } catch (error) {
    console.error('Drive proxy error:', error);
    return new NextResponse('Error fetching image from Google Drive', { status: 500 });
  }
}