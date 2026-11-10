import { NextResponse } from 'next/server';

// Route guards based on the lightweight `rr_session` cookie ("role:userId") that the client sets
// after login. The API still verifies the real JWT on every request.
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('rr_session')?.value;
  const role = session ? session.split(':')[0] : null;

  const toLogin = () => {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  };
  const home = role === 'worker' ? '/worker/dashboard' : role === 'admin' ? '/admin/dashboard' : '/';

  if (pathname.startsWith('/admin')) {
    if (!role) return toLogin();
    if (role !== 'admin') return NextResponse.redirect(new URL('/', request.url));
  }
  if (pathname.startsWith('/worker/')) {
    if (!role) return toLogin();
    if (role !== 'worker') return NextResponse.redirect(new URL('/', request.url));
  }
  if (pathname === '/messages' || pathname.startsWith('/bookings') || pathname === '/profile') {
    if (!role) return toLogin();
  }
  if (pathname === '/login' && role) {
    return NextResponse.redirect(new URL(home, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/worker/:path*', '/messages', '/bookings/:path*', '/bookings', '/profile', '/login', '/join'],
};
