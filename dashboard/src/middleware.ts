import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that are always public — no auth needed
const PUBLIC_PATHS = [
    '/login',
    '/api/auth',    // NextAuth's own endpoints
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Always allow public paths
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Validate the JWT session token
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    const isAuthenticated = !!token;

    // --- API Routes: return 401 JSON ---
    if (pathname.startsWith('/api/')) {
        if (!isAuthenticated) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in at /login.' },
                { status: 401 }
            );
        }
        return NextResponse.next();
    }

    // --- Page Routes: redirect to /login ---
    if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

// Apply middleware to all routes except Next.js internals and static files
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
    ],
};
