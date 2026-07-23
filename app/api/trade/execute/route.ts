import { NextRequest, NextResponse } from "next/server";
import { executeTrade } from "@/lib/trade-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.symbol || !body.side || !body.qty) {
      return NextResponse.json(
        { error: "Missing required fields: symbol, side, qty" },
        { status: 400 }
      );
    }

    const result = await executeTrade({
      symbol: body.symbol,
      side: body.side,
      qty: body.qty,
      price: body.price,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to execute trade" },
      { status: 500 }
    );
  }
}
