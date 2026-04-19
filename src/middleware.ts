import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname, searchParams, origin } = req.nextUrl;

  if (pathname !== "/sale") {
    return NextResponse.next();
  }

  const refCode = searchParams.get("ref");
  if (!refCode) {
    return NextResponse.next();
  }

  const cookieName = `skopi_aff_session_${refCode}`;
  let sessionKey = req.cookies.get(cookieName)?.value;

  const res = NextResponse.next();

  if (!sessionKey) {
    sessionKey = crypto.randomUUID();
    res.cookies.set(cookieName, sessionKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 45, // 45 days
    });
  }

  try {
    const landingPath = `${pathname}${req.nextUrl.search}`;
    const utmSource = searchParams.get("utm_source");
    const utmCampaign = searchParams.get("utm_campaign");

    await fetch(`${origin}/api/marketing-partners/click`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-skopi-internal-click": "1",
      },
      body: JSON.stringify({
        refCode,
        sessionKey,
        landingPath,
        utmSource,
        utmCampaign,
      }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("middleware affiliate click logging failed", err);
  }

  return res;
}

export const config = {
  matcher: ["/sale"],
};
