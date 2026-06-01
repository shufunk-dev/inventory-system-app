import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.SESSION_SECRET || 'super-secret-key-for-development';
const key = new TextEncoder().encode(secretKey);

export async function proxy(request) {
  const path = request.nextUrl.pathname;

  // Define public routes
  const isPublicRoute = path === '/login' || path.startsWith('/api/auth');
  
  // Expose upload API and image paths without auth so the mobile scanner and images work
  const isPublicApiRoute = path.startsWith('/api/upload') || path.startsWith('/uploads/') || path.startsWith('/api/file/');

  if (isPublicRoute || isPublicApiRoute) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await jwtVerify(sessionCookie, key, { algorithms: ['HS256'] });
    return NextResponse.next();
  } catch (error) {
    // Invalid token
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
