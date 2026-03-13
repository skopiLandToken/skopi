import { NextResponse } from "next/server";

export function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = "/auth/login";
  return NextResponse.redirect(url);
}
