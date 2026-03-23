"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import Link from "next/link";

export default function UserMenu() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <div className="h-10 w-32 bg-slate-800/50 rounded-md animate-pulse"></div>
        );
    }

    if (session && session.user) {
        return (
            <div className="flex items-center space-x-4">
                <Link
                    href="/me"
                    className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 px-3 py-2 rounded-full transition-colors"
                >
                    {session.user.image ? (
                        <img src={session.user.image} alt="User Avatar" className="w-6 h-6 rounded-full" />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
                            {session.user.name?.charAt(0) || "U"}
                        </div>
                    )}
                    <span className="text-sm font-medium text-white max-w-[120px] truncate">
                        {session.user.name}
                    </span>
                </Link>
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-slate-400 hover:text-white p-2 transition-colors"
                    title="Sign Out"
                >
                    <LogOut size={18} />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => signIn("google")}
            className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors"
        >
            <User size={16} />
            <span>Log In</span>
        </button>
    );
}
