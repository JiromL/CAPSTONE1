import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Design mockups under /design are for local review only; hide them in production builds.
export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && request.nextUrl.pathname.startsWith('/design')) {
    return NextResponse.rewrite(new URL('/not-found', request.url), { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/design/:path*'],
};
