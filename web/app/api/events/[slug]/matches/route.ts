import { NextResponse } from "next/server";
import { getMatchesByEvent } from "@/lib/directus";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  try {
    const matches = await getMatchesByEvent(params.slug);
    return NextResponse.json(matches);
  } catch (err) {
    console.error("[GET /api/events/[slug]/matches]", err);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 },
    );
  }
}