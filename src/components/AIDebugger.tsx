import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function AIDebugger() {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || loading) return;

        const userMessage: Message = { role: 'user', content: query };
        setMessages(prev => [...prev, userMessage]);
        setQuery('');
        setLoading(true);

        try {
            // @ts-ignore
            const response = await window.electron.invokeAPI('api:gemini-complete', query);

            const assistantMessage: Message = {
                role: 'assistant',
                content: response.text,
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error querying AI Assistant:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please check your internet connection or API key.',
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 flex flex-col" style={{ height: 'calc(100vh - 320px)' }}>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                    <Sparkles className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                    <h2 className="text-sm font-extrabold text-white">SUPPORT AI ASSISTANT</h2>
                    <p className="text-xs" style={{ color: 'rgba(148, 163, 184, 0.7)' }}>
                        Live stats & performance insights
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 glass-card rounded-xl overflow-hidden flex flex-col">
                <div className="flex-1 p-4 space-y-8 overflow-y-auto custom-scrollbar">
                    {messages.length === 0 && (
                        <div className="text-center py-12">
                            <Bot className="w-14 h-14 mx-auto mb-4" style={{ color: 'rgba(148, 163, 184, 0.3)' }} />
                            <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                Ask me about team progress
                            </p>
                            <p className="text-xs" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>
                                Try: "How is the team doing this week?" or "Who are the top solvers this month?"
                            </p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className="space-y-2">
                            <div className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant'
                                    ? 'bg-sky-500/20 border border-sky-500/30'
                                    : 'bg-white/10 border border-white/20'
                                    }`}>
                                    {msg.role === 'assistant' ? (
                                        <Bot className="w-4 h-4 text-sky-400" />
                                    ) : (
                                        <User className="w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                                    )}
                                </div>

                                <div
                                    className={`rounded-2xl px-4 py-3 max-w-[85%] glass-effect inner-glow ${msg.role === 'user'
                                        ? 'bg-sky-500/20 border border-sky-400/30 text-white shadow-[0_0_20px_rgba(56,189,248,0.1)]'
                                        : 'bg-white/5 border border-white/10'
                                        }`}
                                    style={{
                                        color: msg.role === 'assistant' ? 'rgba(255, 255, 255, 0.95)' : 'white',
                                        animation: 'bloom 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                                    }}
                                >
                                    <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
                    <form onSubmit={handleSubmit} className="flex items-end gap-2">
                        <textarea
                            placeholder="Ask about team progress..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            className="input-glass text-sm resize-none"
                            rows={2}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="btn-glass-primary px-4 py-2.5 flex items-center justify-center min-w-[48px]"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </form>
                    <p className="text-xs mt-2" style={{ color: 'rgba(148, 163, 184, 0.5)' }}>
                        AI has live access to your ticket and team data
                    </p>
                </div>
            </div>
        </div>
    );
}
