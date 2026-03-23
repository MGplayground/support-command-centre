import { IntercomStats, ChurnRiskAccount } from './intercom-types';

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface Insight {
    id: string;
    severity: InsightSeverity;
    icon: string;
    title: string;
    message: string;
}

const TWO_HOURS_IN_SECONDS = 2 * 60 * 60;
const CHURN_SPIKE_THRESHOLD = 3; // fire if this many or more churn risk accounts
const VOLUME_SURGE_RATIO = 1.2; // fire if current week > 120% of average previous weeks

/**
 * Computes a list of proactive insight alerts from the current dashboard stats.
 * This is a pure function — no side effects, no API calls.
 */
export function computeInsights(stats: IntercomStats): Insight[] {
    const insights: Insight[] = [];
    const nowTs = Math.floor(Date.now() / 1000);

    // ─── 1. Recent Churn Account (flagged in last 2 hours) ───────────────────
    const churnAccounts = stats.churnRiskAccounts ?? [];
    const recentChurn = churnAccounts.find(
        (a: ChurnRiskAccount) => (nowTs - a.updatedAt) < TWO_HOURS_IN_SECONDS
    );
    if (recentChurn) {
        const displayName = recentChurn.customerName || recentChurn.customerEmail;
        insights.push({
            id: 'recent-churn',
            severity: 'critical',
            icon: '🔴',
            title: 'Urgent Churn Signal',
            message: `${displayName} flagged as high-risk in the last 2 hours. Consider proactive outreach now.`,
        });
    }

    // ─── 2. Churn Spike (many accounts flagged this cycle) ───────────────────
    if (!recentChurn && churnAccounts.length >= CHURN_SPIKE_THRESHOLD) {
        insights.push({
            id: 'churn-spike',
            severity: 'warning',
            icon: '⚠️',
            title: 'Churn Risk Spike',
            message: `${churnAccounts.length} high-risk accounts flagged this week. Review the Risk Radar before end of day.`,
        });
    }

    // ─── 3. SLA Breach ───────────────────────────────────────────────────────
    const breaches = stats.frt?.totalBreaches ?? 0;
    if (breaches > 0) {
        insights.push({
            id: 'sla-breach',
            severity: 'warning',
            icon: '⏱',
            title: 'SLA Breach Detected',
            message: `${breaches} ticket${breaches > 1 ? 's have' : ' has'} breached the 24h SLA. Prioritise the queue now.`,
        });
    }

    // ─── 4. Unassigned Queue Buildup ─────────────────────────────────────────
    const unassigned = stats.chatVolume?.unassigned ?? 0;
    if (unassigned >= 5) {
        insights.push({
            id: 'unassigned-queue',
            severity: 'info',
            icon: '📥',
            title: 'Queue Buildup',
            message: `${unassigned} unassigned conversations are waiting. Assign them before they breach SLA.`,
        });
    }

    // ─── 5. Volume Surge ─────────────────────────────────────────────────────
    const weeklyVolume = stats.weeklyVolume;
    if (weeklyVolume && weeklyVolume.length >= 2) {
        const currentWeekVolume = weeklyVolume[weeklyVolume.length - 1]?.totalCount ?? 0;
        const prevWeeks = weeklyVolume.slice(0, -1);
        const avgPrevVolume = prevWeeks.reduce((sum, w) => sum + (w.totalCount ?? 0), 0) / prevWeeks.length;

        if (avgPrevVolume > 0 && currentWeekVolume > avgPrevVolume * VOLUME_SURGE_RATIO) {
            const pct = Math.round(((currentWeekVolume - avgPrevVolume) / avgPrevVolume) * 100);
            insights.push({
                id: 'volume-surge',
                severity: 'info',
                icon: '📈',
                title: 'Volume Surge',
                message: `Conversation volume is ${pct}% above the recent weekly average. Consider rebalancing workload.`,
            });
        }
    }

    // ─── 6. All Clear ─────────────────────────────────────────────────────────
    if (insights.length === 0) {
        insights.push({
            id: 'all-clear',
            severity: 'success',
            icon: '✅',
            title: 'All Clear',
            message: 'No urgent signals detected. All metrics are within normal range.',
        });
    }

    return insights;
}
