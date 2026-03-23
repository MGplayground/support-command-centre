"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            router.push("/");
        }
    }, [status, router]);

    if (status === "loading" || status === "authenticated") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
            {/* Background glow effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="glass-panel w-full max-w-md p-8 relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-800/80 rounded-2xl border border-slate-700/50 flex items-center justify-center mb-6 shadow-2xl">
                    <Sparkles className="text-violet-400 w-8 h-8" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2 text-center">
                    Support Command Center<span className="text-violet-500">.</span>
                </h1>
                <p className="text-slate-400 text-center mb-8 text-sm">
                    Sign in to access your personal dashboard and team metrics.
                </p>

                <div className="w-full space-y-4">
                    <button
                        onClick={() => signIn("google")}
                        className="w-full relative group hover:-translate-y-0.5 transition-all duration-300"
                    >
                        {/* Button Glow */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-300"></div>

                        <div className="relative flex items-center justify-center space-x-3 bg-slate-900 px-6 py-4 rounded-lg border border-slate-800">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            <span className="text-white font-medium">Continue with Google</span>
                        </div>
                    </button>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-800"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-slate-900 px-2 text-slate-500 rounded-md">Or use a Demo Account</span>
                        </div>
                    </div>

                    <button
                        onClick={() => signIn("credentials", { email: "mauro@clearer.io", name: "Mauro" })}
                        className="w-full relative group hover:-translate-y-0.5 transition-all duration-300"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-300"></div>
                        <div className="relative flex items-center justify-center space-x-3 bg-slate-900 px-6 py-4 rounded-lg border border-slate-800">
                            <span className="text-white font-medium">Log in as Mauro (Demo)</span>
                        </div>
                    </button>

                    <button
                        onClick={() => signIn("credentials", { email: "jenson@clearer.io", name: "Jenson" })}
                        className="w-full relative group hover:-translate-y-0.5 transition-all duration-300"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-300"></div>
                        <div className="relative flex items-center justify-center space-x-3 bg-slate-900 px-6 py-4 rounded-lg border border-slate-800">
                            <span className="text-white font-medium">Log in as Jenson (Demo)</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
