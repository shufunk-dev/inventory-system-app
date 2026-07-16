import { NextResponse } from 'next/server';

export function proxy(request) {
  // Capture current pathname and pass it as a custom request header 'x-pathname'
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Config matching all paths except static assets, media, and API paths we want to bypass
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|ttf|eot)).*)',
  ],
};
