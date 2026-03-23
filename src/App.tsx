import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LayoutDashboard, Search, Bot, Minus, X } from 'lucide-react';
import StatsCenter from './components/StatsCenter';
import ShopifySearch from './components/ShopifySearch';
import AIDebugger from './components/AIDebugger';
import GoalTracker from './components/GoalTracker';
import { SetupScreen } from './components/SetupScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
// Import the popup component
import './index.css';

type Tab = 'overview' | 'search' | 'ai';

function Dashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [isDragging, setIsDragging] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isCheckingSetup, setIsCheckingSetup] = useState(true);

    // Check if user email is configured on mount
    useEffect(() => {
        const checkUserEmail = async () => {
            try {
                // @ts-ignore
                const email = await window.electron.invokeAPI('api:get-user-email');
                setUserEmail(email);
            } catch (error) {
                console.log('No user email configured yet');
                setUserEmail(null);
            } finally {
                setIsCheckingSetup(false);
            }
        };
        checkUserEmail();
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.no-drag')) {
            return;
        }
        setIsDragging(true);
        window.electron?.startDrag({ x: e.screenX, y: e.screenY });
    };

    // Window dragging effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                window.electron?.dragWindow({ x: e.screenX, y: e.screenY });
            }
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                window.electron?.endDrag();
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleSetupComplete = (email: string) => {
        setUserEmail(email);
    };

    // Show loading state while checking
    if (isCheckingSetup) {
        return (
            <div className="h-screen w-screen bg-black flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    // Show setup screen if no email configured
    if (!userEmail) {
        return <SetupScreen onComplete={handleSetupComplete} />;
    }

    const handleMinimize = () => {
        window.electron?.minimizeWindow();
    };

    const handleClose = () => {
        window.electron?.closeWindow();
    };

    const tabs = [
        { id: 'overview' as Tab, label: 'Overview', icon: LayoutDashboard },
        { id: 'search' as Tab, label: 'Search', icon: Search },
        { id: 'ai' as Tab, label: 'AI Helper', icon: Bot },
    ];

    return (
        <div className="w-full h-screen flex items-center justify-center app-background">
            <ErrorBoundary>
                <div className="w-full max-w-md h-full liquid-card overflow-hidden flex flex-col">
                    {/* Title Bar */}
                    <div
                        className="flex items-center justify-between px-4 py-3 cursor-move select-none"
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
                        onMouseDown={handleMouseDown}
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_12px_hsla(187,92%,45%,0.8)] animate-pulse"></div>
                            <h1 className="text-[11px] font-black tracking-[0.3em] text-white font-['Outfit'] uppercase">Support<span className="text-cyan-400">Cockpit</span></h1>
                        </div>

                        <div className="flex items-center gap-1 no-drag">
                            <button
                                onClick={handleMinimize}
                                className="p-1.5 rounded-md hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                            >
                                <Minus className="w-3 h-3" />
                            </button>
                            <button
                                onClick={handleClose}
                                className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Tabs - Segmented Control Style */}
                    <div className="px-4 py-3 no-drag">
                        <div className="flex bg-slate-900/40 p-1 rounded-xl border border-white/5 backdrop-blur-md">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all duration-200 ${isActive
                                            ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)] border border-cyan-500/20'
                                            : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        <Icon className="w-3 h-3" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar no-drag">
                        {activeTab === 'overview' && (
                            <div className="p-5 space-y-6">
                                <GoalTracker />
                                <StatsCenter />
                            </div>
                        )}

                        {activeTab === 'search' && (
                            <div className="p-5">
                                <ShopifySearch />
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div className="p-5">
                                <AIDebugger />
                            </div>
                        )}
                    </div>
                </div>
            </ErrorBoundary>
        </div>
    );
}

function App() {
    return (
        <Routes>
            <Route path="/" element={<Dashboard />} />
        </Routes>
    );
}

export default App;
