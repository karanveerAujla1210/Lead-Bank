import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('sb-access-token');
    const demoAuth = request.cookies.get('leadbank_demo_auth')?.value === '1';
    if (!token && !demoAuth) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
