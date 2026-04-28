import { NextResponse } from "next/server";
import { getMatchesByEvent } from "@/lib/directus";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const matches = await getMatchesByEvent(params.slug);
  return NextResponse.json(matches);
}