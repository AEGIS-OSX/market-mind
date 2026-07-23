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

    let validatedCap: number | undefined = undefined;
    if (body.investment_cap !== undefined) {
      const capValue = body.investment_cap;
      const numericCap = typeof capValue === 'number' ? capValue : parseFloat(capValue);
      if (typeof numericCap !== 'number' || isNaN(numericCap)) {
        return NextResponse.json(
          { error: "Investment cap must be a valid number" },
          { status: 400 }
        );
      }
      if (numericCap < 0) {
        return NextResponse.json(
          { error: "Investment cap cannot be negative" },
          { status: 400 }
        );
      }
      if (numericCap > 10_000_000) {
        return NextResponse.json(
          { error: "Investment cap cannot exceed $10,000,000" },
          { status: 400 }
        );
      }
      validatedCap = numericCap;
    }

    const updated = updateUserSettings({
      execution_mode: body.execution_mode,
      risk_level: body.risk_level,
      investment_cap: validatedCap,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
