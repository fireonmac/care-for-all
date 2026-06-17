import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Check for the existence of the better-auth session cookie.
  // Note: For secure production use, better-auth session cookie names might vary by secure/__Host prefix.
  // This is a lightweight check to redirect away from the login page.
  const hasSession = 
    request.cookies.has("better-auth.session_token") || 
    request.cookies.has("__Secure-better-auth.session_token");

  if (hasSession && request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login"],
};
