import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

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
        CredentialsProvider({
            name: "Demo Account",
            credentials: {
                email: { label: "Email", type: "text", placeholder: "mauro@clearer.io" },
                name: { label: "Name", type: "text", placeholder: "Mauro" }
            },
            async authorize(credentials) {
                if (credentials?.email) {
                    return {
                        id: credentials.email,
                        name: credentials.name || "Demo User",
                        email: credentials.email,
                        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + credentials.email
                    };
                }
                return null;
            }
        })
    ],
    callbacks: {
        async session({ session, token }: any) {
            console.log("[NextAuth] Session Callback. Token:", { id: token.id, picture: token.picture });
            if (session.user) {
                session.user.id = token.sub || token.id || token.email;
                if (token.picture) session.user.image = token.picture;
            }
            console.log("[NextAuth] Session Output:", { user: session.user });
            return session;
        },
        async jwt({ token, user, account, profile }: any) {
            if (user) {
                console.log("[NextAuth] JWT initial sign-in. User:", { id: user.id, image: user.image });
                token.id = user.id;
                // Capture the image from the unified user object on first sign-in
                if (user.image) token.picture = user.image;
            }
            if (profile) {
                console.log("[NextAuth] JWT Profile:", { picture: profile.picture });
            }
            // Fallback to Google profile specifically
            if (profile?.picture) {
                token.picture = profile.picture;
            }
            return token;
        }
    },
    pages: {
        signIn: '/login', // Custom login page
    },
    session: {
        strategy: "jwt" as const,
    },
    secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_local_development_only",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
