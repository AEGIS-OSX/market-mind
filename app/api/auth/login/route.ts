import { NextResponse } from "next/server";

const DEMO_USERNAME = process.env.DEMO_USERNAME ?? "admin";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "market-mind-2024";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      username.trim() === "" ||
      password.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("mm_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
