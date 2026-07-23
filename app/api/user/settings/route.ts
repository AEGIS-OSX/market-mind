import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getUserSettings, updateUserSettings } from "@/lib/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "change-me-in-production"
);

const VALID_RISK_LEVELS = ["conservative", "moderate", "aggressive"] as const;
const VALID_EXECUTION_MODES = ["auto", "recommend"] as const;

async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return (payload.sub as string) || (payload.user_id as string) || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = getUserSettings(userId);
  return NextResponse.json(settings, { status: 200 });
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate risk_level if provided
  if (body.risk_level !== undefined) {
    if (
      !VALID_RISK_LEVELS.includes(
        body.risk_level as (typeof VALID_RISK_LEVELS)[number]
      )
    ) {
      return NextResponse.json(
        { error: `risk_level must be one of: ${VALID_RISK_LEVELS.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // Validate investment_cap if provided
  if (body.investment_cap !== undefined && body.investment_cap !== null) {
    const cap = Number(body.investment_cap);
    if (Number.isNaN(cap) || cap <= 0) {
      return NextResponse.json(
        { error: "investment_cap must be a positive number or null" },
        { status: 400 }
      );
    }
    body.investment_cap = cap;
  }

  // Validate execution_mode if provided
  if (body.execution_mode !== undefined) {
    if (
      !VALID_EXECUTION_MODES.includes(
        body.execution_mode as (typeof VALID_EXECUTION_MODES)[number]
      )
    ) {
      return NextResponse.json(
        { error: `execution_mode must be one of: ${VALID_EXECUTION_MODES.join(", ")}` },
        { status: 400 }
      );
    }
  }

  const updates: Partial<Omit<UserSettings, "user_id">> = {};
  if (body.risk_level !== undefined)
    updates.risk_level = body.risk_level as string;
  if (body.investment_cap !== undefined)
    updates.investment_cap = body.investment_cap as number | null;
  if (body.execution_mode !== undefined)
    updates.execution_mode = body.execution_mode as "auto" | "recommend";
  if (body.brokerage_connected !== undefined)
    updates.brokerage_connected = body.brokerage_connected as boolean;

  const saved = updateUserSettings(userId, updates);
  return NextResponse.json(saved, { status: 200 });
}
