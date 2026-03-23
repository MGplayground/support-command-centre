'use client';

import { useState } from 'react';
import { useIntercom } from '@/hooks/useIntercom';
import {
  Users as UsersIcon, LayoutGrid, Clock, CheckCircle, Flame, Target, MessageSquare, Zap, Activity, ShieldCheck,
  TrendingDown, TrendingUp, MonitorPlay, Monitor, Search, BarChart3, RotateCw, Play, Pause, ListFilter, SlidersHorizontal, ArrowUpRight, AlertTriangle, AlertCircle, Loader2, Users, Trophy
} from "lucide-react";

import { clsx } from 'clsx';
import { format, startOfWeek, endOfWeek, subDays, formatDistanceToNow } from 'date-fns';
import { getTimeframeConfig } from '@/lib/timeframe-config';
import AIChat from '@/components/AIChat';

import VolumeChart from '@/components/VolumeChart';
import TrendBadge from '@/components/TrendBadge';
import TierToggle from '@/components/TierToggle';
import TimeframeToggle from '@/components/TimeframeToggle';
import T3PerformanceTracker from '@/components/T3PerformanceTracker';
import RefreshControl from '@/components/RefreshControl';
import ProductStatsView from '@/components/ProductStatsView';
import ChurnRiskCard from '@/components/ChurnRiskCard';
import { TierType, TimeframeType } from '@/lib/intercom-types';
import { getTierConfig } from '@/lib/tier-config';
import LiveTicker from '@/components/LiveTicker';
import CommonIssuesWidget from '@/components/CommonIssuesWidget';
import ReviewsWidget from '@/components/ReviewsWidget';
import ProactiveInsightsBar from '@/components/ProactiveInsightsBar';
import { computeInsights } from '@/lib/insights-engine';
import { useEffect, useMemo } from 'react';

import { usePersistedState } from '@/hooks/use-persisted-state';

export default function DashboardPage() {
  const [currentTier, setCurrentTier] = usePersistedState<TierType>('dashboard:tier', 'ALL');
  const [currentTimeframe, setCurrentTimeframe] = usePersistedState<TimeframeType>('dashboard:timeframe', 'current_week');
  const [activeTab, setActiveTab] = usePersistedState<'squad' | 'products'>('dashboard:tab', 'squad');
  const [refreshInterval, setRefreshInterval] = usePersistedState('dashboard:refreshInterval', 60000);
  const [isPaused, setIsPaused] = usePersistedState('dashboard:paused', false);
  const [isAutoCycle, setIsAutoCycle] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Fix hydration for date-dependent UI
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // TV Mode: Auto-cycle between views
  useEffect(() => {
    if (!isAutoCycle) return;

    const interval = setInterval(() => {
      setActiveTab(prev => prev === 'squad' ? 'products' : 'squad');
    }, 30000); // Rotate every 30 seconds

    return () => clearInterval(interval);
  }, [isAutoCycle]);

  // Fast-pass: Load core Intercom metrics immediately (skip Databricks)
  const { stats: quickStats, isLoading: isQuickLoading, isError: isQuickError, refresh: refreshQuick } = useIntercom(currentTier, currentTimeframe, {
    refreshInterval,
    isLightweight: true
  });

  // Slow-pass: Load heavy Databricks insights in the background
  const { stats: fullStats, isLoading: isFullLoading, refresh: refreshFull } = useIntercom(currentTier, currentTimeframe, {
    refreshInterval,
    isLightweight: false
  });

  // Combine them: Use fullStats if available, otherwise quickStats with undefined insights
  const stats = fullStats || quickStats;
  const isLoading = isQuickLoading && !stats;
  const isError = isQuickError;

  const refresh = () => {
    refreshQuick();
    refreshFull();
  };

  const tierConfig = getTierConfig(currentTier);
  const tfConfig = getTimeframeConfig(currentTimeframe);
  const isCurrentWeek = currentTimeframe === 'current_week';

  // Compute the display date range based on the selected timeframe
  const now = new Date();
  const rangeStart = isCurrentWeek
    ? startOfWeek(now, { weekStartsOn: 1 })
    : subDays(now, tfConfig.days);
  const rangeEnd = isCurrentWeek
    ? endOfWeek(now, { weekStartsOn: 1 })
    : now;
  const primaryLabel = isCurrentWeek ? 'This Week' : tfConfig.name;
  const secondaryLabel = isCurrentWeek ? 'Month' : tfConfig.name;

  // Hooks must be declared before any early returns (Rules of Hooks)
  const insights = useMemo(() => stats ? computeInsights(stats) : [], [stats]);

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center text-red-400">
        <AlertCircle className="mr-2 h-6 w-6" />
        Failed to load dashboard data. Check API configuration.
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-violet-500" />
        Initializing Command Center...
      </div>
    );
  }


  // Calculate percentages/progress
  const weekGoal = 500;
  const teamProgress = Math.min(100, (stats.solved.team.week / weekGoal) * 100);

  // Convert FRT seconds to readable format (API now returns seconds, not minutes)
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) {
      const secs = seconds % 60;
      return `${mins}m${secs > 0 ? ` ${secs}s` : ''}`;
    }
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h${remainMins > 0 ? ` ${remainMins}m` : ''}`;
  };

  return (
    <div className="p-8 w-full space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Support Command Center
            <span className="text-violet-500">.</span>
          </h1>
          <p className="text-slate-400 mt-1">
            Real-time performance metrics for {tierConfig.name}
          </p>

          {/* Date Context */}
          <div className="flex items-center space-x-2 mt-2 text-xs font-medium text-slate-500 uppercase tracking-widest">
            {isMounted ? (
              <>
                <span className="flex items-center text-violet-400">
                  <Clock className="w-3 h-3 mr-1" />
                  {format(rangeStart, 'MMM d')} - {format(rangeEnd, 'MMM d')}
                </span>
                <span className="text-slate-600">•</span>
                <span>{isCurrentWeek ? format(now, 'MMMM yyyy') : tfConfig.name}</span>
              </>
            ) : (
              <span className="text-slate-700 italic">Syncing clocks...</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsAutoCycle(!isAutoCycle)}
            className={clsx(
              "flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-300",
              isAutoCycle
                ? "bg-violet-600 text-white border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-white"
            )}
            title={isAutoCycle ? "Stop TV Mode" : "Activate TV Mode"}
          >
            {isAutoCycle ? <MonitorPlay size={16} /> : <Monitor size={16} />}
            <span className="text-xs font-bold uppercase tracking-wider">TV Mode</span>
          </button>

          <TimeframeToggle currentTimeframe={currentTimeframe} onTimeframeChange={setCurrentTimeframe} />
          <TierToggle currentTier={currentTier} onTierChange={setCurrentTier} />
          <RefreshControl
            isRefreshing={isLoading}
            lastUpdated={stats.lastUpdated}
            onRefresh={() => refresh()}
            refreshInterval={refreshInterval}
            onIntervalChange={setRefreshInterval}
            isPaused={isPaused}
            onPauseToggle={() => setIsPaused(!isPaused)}
          />
        </div>
      </div>

      {/* Proactive AI Insights Bar */}
      <ProactiveInsightsBar insights={insights} />

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-700/50 pb-px">
        <button
          onClick={() => setActiveTab('squad')}
          className={`flex items-center space-x-2 px-6 py-3 text-sm font-semibold transition-all relative ${activeTab === 'squad' ? 'text-violet-400' : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          <UsersIcon className="h-4 w-4" />
          <span>Squad Overview</span>
          {activeTab === 'squad' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center space-x-2 px-6 py-3 text-sm font-semibold transition-all relative ${activeTab === 'products' ? 'text-violet-400' : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          <LayoutGrid className="h-4 w-4" />
          <span>Product Segmentation</span>
          {activeTab === 'products' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
          )}
        </button>
      </div>

      {activeTab === 'squad' ? (
        <>
          {/* Primary Metrics Grid (TV Style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">


            {/* Metric 1: Team Solves (Month) */}
            <div className="glass-panel p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity size={64} className="text-violet-400" />
              </div>
              <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Team Solves ({secondaryLabel})</h3>
              <div className="mt-2 flex items-baseline">
                <span className="text-5xl font-bold text-white">{stats.solved.team.month}</span>
                {stats.solved.team.monthTrend !== undefined && stats.solved.team.monthTrend !== 0 && (
                  <div className="ml-3">
                    <TrendBadge value={stats.solved.team.monthTrend} />
                  </div>
                )}
              </div>
              <div className="mt-4 w-full bg-slate-700/50 rounded-full h-1.5">
                {/* Assuming a monthly team goal of ~2000 (4x the weekly 500 goal) */}
                <div
                  className="bg-violet-500 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, (stats.solved.team.month / 2000) * 100)}%` }}
                />
              </div>
            </div>



            {/* Metric 2: Team Week */}
            <div className="glass-panel p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users size={64} className="text-blue-400" />
              </div>
              <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Team Solves ({primaryLabel})</h3>
              <div className="mt-2 flex items-baseline">
                <span className="text-5xl font-bold text-white">{stats.solved.team.week}</span>
                {stats.solved.team.weekTrend !== undefined && stats.solved.team.weekTrend !== 0 && (
                  <div className="ml-3">
                    <TrendBadge value={stats.solved.team.weekTrend} />
                  </div>
                )}
              </div>
              <div className="mt-4 w-full bg-slate-700/50 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${teamProgress}%` }}
                />
              </div>
            </div>

            {/* Metric 3: FRT or SLA Breaches */}
            {currentTier === 'T2' ? (
              <div className="glass-panel p-6 relative overflow-hidden group border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <AlertTriangle size={64} className="text-amber-400" />
                </div>
                <h3 className="text-amber-400 text-sm font-medium uppercase tracking-wider">Tickets Breaching SLA</h3>
                <div className="mt-2 flex items-baseline">
                  <span className="text-5xl font-bold text-white shadow-amber-500/50 drop-shadow-lg">{stats.frt.totalBreaches || 0}</span>
                </div>
                <div className="mt-4 flex items-center space-x-2 text-xs text-slate-500">
                  <span className="text-amber-500 font-medium">Warning</span>
                  <span>•</span>
                  <span>{stats.frt.totalBreaches === 0 ? "All healthy" : "Requires immediate action"}</span>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Clock size={64} className="text-cyan-400" />
                </div>
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Median Response Time</h3>
                <div className="mt-2 flex items-baseline">
                  <span className="text-5xl font-bold text-white">{formatTime(stats.frt.week.median)}</span>
                  {stats.frt.week.trend !== undefined && stats.frt.week.trend !== 0 && (
                    <div className="ml-3">
                      <TrendBadge value={stats.frt.week.trend} inverse />
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center space-x-2 text-xs text-slate-500">
                  <span className="text-cyan-400">{stats.frt.slaCompliance}% SLA</span>
                  <span>•</span>
                  <span>Avg: {formatTime(stats.frt.week.average)}</span>
                </div>
              </div>
            )}

            {/* Metric 4: CSAT or T3 Escalations */}
            {currentTier === 'T2' ? (
              <div className="glass-panel p-6 relative overflow-hidden group border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ArrowUpRight size={64} className="text-rose-400" />
                </div>
                <h3 className="text-rose-400 text-sm font-medium uppercase tracking-wider">Escalated to T3</h3>
                <div className="mt-2 flex items-baseline">
                  <span className="text-5xl font-bold text-white shadow-rose-500/50 drop-shadow-lg">{stats.chatVolume.escalationsToT3 || 0}</span>
                </div>
                <div className="mt-4 flex items-center space-x-2 text-xs text-slate-500">
                  <span className="text-rose-500 font-medium">Critical Issues</span>
                  <span>•</span>
                  <span>Sent to Devs</span>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <CheckCircle size={64} className="text-emerald-400" />
                </div>
                <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">CSAT Score ({secondaryLabel})</h3>
                <div className="mt-2 flex items-baseline">
                  <span className="text-5xl font-bold text-white">{(stats.csat.month.percentage).toFixed(0)}%</span>
                  {stats.csat.trend !== undefined && stats.csat.trend !== 0 && (
                    <div className="ml-3">
                      <TrendBadge value={stats.csat.trend} suffix="pts" />
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center space-x-2 text-xs text-slate-500">
                  <span className="text-emerald-400">{stats.csat.month.positiveRatings} Positive</span>
                  <span>•</span>
                  <span>{stats.csat.month.pending} Pending</span>
                </div>
              </div>
            )}

            {/* Metric 5: Queue Status */}
            <div className="glass-panel p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <MessageSquare size={64} className="text-amber-400" />
              </div>
              <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Queue Status</h3>
              <div className="mt-2 flex items-baseline">
                <span className="text-5xl font-bold text-white">{stats.chatVolume.active}</span>
              </div>
              <div className="mt-4 flex space-x-3 text-xs">
                <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {stats.chatVolume.snoozed} Snoozed
                </span>
                <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {stats.chatVolume.unassigned} Unassigned
                </span>
              </div>
            </div>

          </div>

          {/* Volume Chart & Churn Risk Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel p-6 flex flex-col">
              <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4">Conversation Volume (8-Week Trend)</h3>
              <div className="flex-1">
                <VolumeChart stats={stats} />
              </div>
            </div>
            <div className="lg:col-span-1 h-[320px]">
              <ChurnRiskCard accounts={stats.churnRiskAccounts} />
            </div>
          </div>


          {/* Tier 3 Performance Tracker - Only show for T3 */}
          {currentTier === 'T3' && <T3PerformanceTracker />}

          {/* Content Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
            {/* Leaderboard (Span 2) */}
            <div className="lg:col-span-2 glass-panel p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Trophy className="mr-2 text-yellow-500" size={20} />
                  Team Leaderboard
                </h3>
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                  {isMounted ? `${format(rangeStart, 'MMM d')} - ${format(rangeEnd, 'MMM d')}` : ''}
                </span>
              </div>


              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {stats.leaderboard.map((agent, index) => (
                  <div
                    key={agent.id}
                    className="flex items-center p-4 rounded-xl bg-slate-800/40 border border-white/5 hover:bg-slate-800/60 transition-colors"
                    style={{
                      animationDelay: `${index * 100}ms`
                    }}
                  >
                    <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full font-bold mr-4
                    ${index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                        index === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' :
                          index === 2 ? 'bg-amber-700/20 text-amber-700 border border-amber-700/30' :
                            'bg-slate-700/50 text-slate-500'}
                `}>
                      {index + 1}
                    </div>

                    {/* Gamified Avatar with Daily Goal Ring */}
                    <div className="relative mr-4 h-12 w-12 flex items-center justify-center shrink-0">
                      {/* Ring */}
                      <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                        {/* Track */}
                        <path
                          className="text-slate-700/50"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        {/* Progress */}
                        <path
                          className={`${(agent.dailyCount || 0) >= 20 ? 'text-amber-500 animate-pulse' : 'text-violet-500'} transition-all duration-1000`}
                          strokeDasharray={`${Math.min(100, ((agent.dailyCount || 0) / 20) * 100)}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>

                      {/* Avatar Inner */}
                      <div className="h-9 w-9 rounded-full bg-slate-700 overflow-hidden border border-slate-600 relative z-10">
                        {agent.avatar ? (
                          <img src={agent.avatar} alt={agent.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs text-center leading-none">
                            {agent.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Fire Badge if Goal Met */}
                      {(agent.dailyCount || 0) >= 20 && (
                        <div className="absolute -bottom-1 -right-1 z-20 bg-amber-500 rounded-full p-0.5 border-2 border-slate-900">
                          <Flame size={10} className="text-white fill-white" />
                        </div>
                      )}
                    </div>


                    <div className="flex-1">
                      <h4 className="text-white font-medium flex items-center gap-2">
                        {agent.name}
                        {currentTier === 'T2' && (agent.escalatedCount ?? 0) > 0 && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              {agent.escalatedCount} {agent.escalatedCount === 1 ? 'Escalation' : 'Escalations'}
                            </span>
                        )}
                      </h4>
                      <div className="w-full bg-slate-700/30 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-blue-500/60 rounded-full"
                          style={{ width: `${(agent.count / (stats.leaderboard[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right pl-4">
                      <span className="text-2xl font-bold text-white block">{agent.count}</span>
                      <span className="text-xs text-slate-500 uppercase">Solves</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Common Issues + Reviews stacked */}
            <div className="flex flex-col gap-6">
              <CommonIssuesWidget issues={stats.commonIssues} />
              <ReviewsWidget />
            </div>
          </div>

          <AIChat />
        </>
      ) : (
        <ProductStatsView stats={stats} />
      )}

      <LiveTicker stats={stats} />
    </div>

  );
}
