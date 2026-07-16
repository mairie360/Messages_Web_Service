import { NextRequest, NextResponse } from "next/server";

type JwtClaims = {
  sub?: string | number;
};

const DEFAULT_USER_BFF_URL = "http://localhost:4000";

function getUserBffUrl(path: string) {
  const baseUrl = (
    process.env.USER_BFF_URL ??
    process.env.BFF_USER_API_URL ??
    DEFAULT_USER_BFF_URL
  ).replace(/\/+$/, "");

  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}

function getUserId(token: string) {
  try {
    const [, encodedPayload] = token.split(".");
    const claims = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as JwtClaims;
    const userId = Number(claims.sub);

    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
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
  const userId = token ? getUserId(token) : null;

  if (!token || !userId) {
    return NextResponse.json({ message: "Session invalide." }, { status: 401 });
  }

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  try {
    const [userResponse, groupsResponse] = await Promise.all([
      fetch(getUserBffUrl(`/user/${userId}/about`), {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      }),
      fetch(getUserBffUrl("/bff/admin/groups"), {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      }),
    ]);

    if (userResponse.status === 401 || groupsResponse.status === 401) {
      return NextResponse.json({ message: "Session expirée." }, { status: 401 });
    }

    const [user, groupsBody] = await Promise.all([
      userResponse.ok ? readJson(userResponse) : null,
      groupsResponse.ok ? readJson(groupsResponse) : null,
    ]);

    return NextResponse.json(
      {
        user,
        groups:
          typeof groupsBody === "object" &&
          groupsBody !== null &&
          "groups" in groupsBody
            ? groupsBody.groups
            : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { message: "Le service utilisateur est indisponible." },
      { status: 502 },
    );
  }
}
