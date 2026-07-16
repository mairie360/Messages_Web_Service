import { NextRequest, NextResponse } from "next/server";

const DEFAULT_USER_BFF_URL = "http://localhost:4000";

function getUserBffUrl(path: string) {
  const baseUrl = (
    process.env.USER_BFF_URL ??
    process.env.BFF_USER_API_URL ??
    DEFAULT_USER_BFF_URL
  ).replace(/\/+$/, "");

  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("accessToken")?.value;

  if (!token) {
    return NextResponse.json({ message: "Session invalide." }, { status: 401 });
  }

  try {
    const upstreamResponse = await fetch(getUserBffUrl("/session/me"), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (upstreamResponse.status === 401) {
      return NextResponse.json({ message: "Session expirée." }, { status: 401 });
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { message: "Le contexte utilisateur est indisponible." },
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json(await readJson(upstreamResponse), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { message: "Le service utilisateur est indisponible." },
      { status: 502 },
    );
  }
}
