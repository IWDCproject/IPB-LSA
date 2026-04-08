import sharp from "sharp";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("url");
  const blurPx   = parseFloat(searchParams.get("blur") || "8");
  const W        = parseInt(searchParams.get("w") || "1200");
  const H        = parseInt(searchParams.get("h") || "800");

  if (!imageUrl) {
    return new Response("Missing url", { status: 400 });
  }

  try {
    const imageBuffer = await fetch(imageUrl).then((r) => {
      if (!r.ok) throw new Error(`Upstream fetch failed: ${r.status}`);
      return r.arrayBuffer();
    });

    // Sharp's sigma maps 1:1 with CSS blur px for Gaussian blur
    const result = await sharp(Buffer.from(imageBuffer))
      .resize(W, H, { fit: "inside"})
      .blur(Math.max(0.3, blurPx)) // sharp minimum sigma is 0.3
      .webp({ quality: 60 })
      .toBuffer();

    return new Response(result, {
      headers: {
        "Content-Type": "image/webp",
        // Immutable cache — same url+params = same result forever
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[blur/route] error:", err.message);
    return new Response("Failed to process image", { status: 500 });
  }
}