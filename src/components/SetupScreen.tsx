import React, { useState } from 'react';

interface SetupScreenProps {
    onComplete: (email: string) => void;
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
    const [email, setEmail] = useState('');
    const [isValidating, setIsValidating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !email.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }

        setIsValidating(true);

        // Save email via IPC
        try {
            await window.electron.invokeAPI('api:save-user-email', email);
            onComplete(email);
        } catch (error) {
            console.error('Failed to save email:', error);
            alert('Failed to save email. Please try again.');
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="liquid-card w-full max-w-md p-8 mx-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        Welcome to Support Cockpit
                    </h1>
                    <p className="text-slate-400 text-sm">
                        Let's personalize your dashboard
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                            Your Support Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="john@company.com"
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                            required
                            autoFocus
                            disabled={isValidating}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                            This email will be used to filter your tickets and chats
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isValidating}
                        className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isValidating ? 'Setting up...' : 'Continue'}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-6 pt-6 border-t border-slate-800">
                    <p className="text-xs text-slate-500 text-center">
                        Your email is stored locally and never sent to external servers
                    </p>
                </div>
            </div>
        </div>
    );
}
