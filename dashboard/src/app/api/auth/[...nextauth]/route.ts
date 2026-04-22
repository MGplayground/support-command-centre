import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const ALLOWED_DOMAIN = 'clearer.io';

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    scope: "openid profile email"
                }
            }
        }),
    ],
    callbacks: {
        async signIn({ user }: any) {
            // Only allow @clearer.io Google accounts
            const email = user?.email || '';
            if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
                console.warn(`[NextAuth] Blocked sign-in attempt from: ${email}`);
                return false;
            }
            return true;
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.sub || token.id || token.email;
                if (token.picture) session.user.image = token.picture;
            }
            return session;
        },
        async jwt({ token, user, profile }: any) {
            if (user) {
                token.id = user.id;
                if (user.image) token.picture = user.image;
            }
            if (profile?.picture) {
                token.picture = profile.picture;
            }
            return token;
        }
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: "jwt" as const,
    },
    secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_local_development_only",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
