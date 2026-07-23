import { NextRequest, NextResponse } from "next/server";
import { getUserSettings, updateUserSettings } from "@/lib/db";

export async function GET() {
  const settings = getUserSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.execution_mode !== undefined) {
      if (!["auto", "recommend"].includes(body.execution_mode)) {
        return NextResponse.json(
          { error: 'Invalid execution_mode. Must be "auto" or "recommend"' },
          { status: 400 }
        );
      }
    }

    const updated = updateUserSettings({
      execution_mode: body.execution_mode,
      risk_level: body.risk_level,
      investment_cap: body.investment_cap,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
