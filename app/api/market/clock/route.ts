import { NextResponse } from "next/server";
import { getMarketStatus } from "@/lib/marketHours";

export const dynamic = "force-dynamic";

// GET /api/market/clock — public: contains no user or priced data, only the
// computed US market session state (calendar + ET clock).
export async function GET() {
  return NextResponse.json(getMarketStatus(new Date()));
}
