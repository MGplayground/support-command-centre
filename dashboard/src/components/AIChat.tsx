'use client';

import { useState } from 'react';
import { Sparkles, Send, X, MessageSquare, Bot } from 'lucide-react';
import { useIntercom } from '@/hooks/useIntercom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AIChat() {
    const { stats } = useIntercom();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([
        { role: 'assistant', text: "Hello! I'm your Support AI. I have access to the live dashboard metrics. Ask me anything!" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    context: stats // Pass current stats as context
                })
            });

            const data = await response.json();

            if (data.error) throw new Error(data.error);

            setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
        } catch (e: any) {
            setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I encountered an error: " + e.message }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-8 right-8 p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 z-50
            ${isOpen ? 'translate-y-24 opacity-0 pointer-events-none' : 'bg-violet-600 hover:bg-violet-500 text-white'}
        `}
            >
                <Sparkles size={24} />
            </button>

            <div
                className={`fixed bottom-8 right-8 w-[400px] h-[600px] glass-panel flex flex-col transition-all duration-300 transform z-50
            ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}
        `}
            >
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-violet-600/20 rounded-t-xl">
                    <div className="flex items-center space-x-2">
                        <Bot className="text-violet-300" size={20} />
                        <h3 className="text-white font-semibold">Support AI Assistant</h3>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm prose prose-invert transition-all 
                                prose-p:mb-3 prose-p:leading-relaxed 
                                prose-headings:text-violet-300 prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-bold
                                prose-ul:mb-3 prose-li:mb-1
                                ${msg.role === 'user'
                                ? 'bg-violet-600 text-white rounded-br-none'
                                : 'bg-slate-700/90 text-slate-200 rounded-bl-none shadow-xl border border-white/10'
                                }`}>
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h3: ({node, ...props}) => <h3 className="text-sm uppercase tracking-wider border-b border-white/10 pb-1 mb-3" {...props} />,
                                        table: ({node, ...props}) => (
                                            <div className="overflow-x-auto my-4 rounded-lg border border-white/10 shadow-inner">
                                                <table className="min-w-full divide-y divide-white/10 text-xs" {...props} />
                                            </div>
                                        ),
                                        th: ({node, ...props}) => <th className="px-3 py-2 text-left bg-white/5 font-semibold text-violet-300" {...props} />,
                                        td: ({node, ...props}) => <td className="px-3 py-2 border-t border-white/5" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1" {...props} />,
                                        p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-700/80 p-3 rounded-2xl rounded-bl-none">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10">
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Ask about team performance..."
                            className="w-full bg-slate-800/50 border border-slate-600/50 rounded-full py-3 px-4 pr-12 text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                        />
                        <button
                            onClick={sendMessage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-violet-600 rounded-full text-white hover:bg-violet-500 transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
