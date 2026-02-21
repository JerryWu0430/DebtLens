import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/github-write";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const user = await validateToken(token);

    return NextResponse.json({ valid: true, login: user.login });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid token" },
      { status: 401 }
    );
  }
}
