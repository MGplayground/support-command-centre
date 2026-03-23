// Client-side data validation utilities
import { IntercomStats, TierType } from './intercom-types';

export interface ValidationResult {
    isValid: boolean;
    warnings: string[];
    errors: string[];
    timestamp: number;
}

export interface DataAnomalies {
    outliers: {
        metric: string;
        value: number;
        expected: string;
        severity: 'low' | 'medium' | 'high';
    }[];
    suspiciousPatterns: {
        pattern: string;
        description: string;
    }[];
}

/**
 * Validates IntercomStats for sanity and detects anomalies
 */
export function validateStats(stats: IntercomStats | undefined, tier: TierType): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!stats) {
        errors.push('Stats data is undefined');
        return { isValid: false, warnings, errors, timestamp: Date.now() };
    }

    // Check data freshness
    const lastUpdated = new Date(stats.lastUpdated);
    const ageMinutes = (Date.now() - lastUpdated.getTime()) / 1000 / 60;

    if (ageMinutes > 60) {
        errors.push(`Data is very stale (${Math.round(ageMinutes)} minutes old)`);
    } else if (ageMinutes > 5) {
        warnings.push(`Data is somewhat stale (${Math.round(ageMinutes)} minutes old)`);
    }

    // Validate team solves
    const teamSolves = stats.solved?.team;
    if (teamSolves) {
        if (teamSolves.week < 0 || teamSolves.month < 0) {
            errors.push('Negative solve counts detected');
        }
        if (teamSolves.week > teamSolves.month) {
            warnings.push('Weekly solves exceed monthly solves');
        }
        // Outlier detection for spike
        if ((teamSolves.weekTrend || 0) > 200) {
            warnings.push(`Unusual spike in weekly solves (+${teamSolves.weekTrend}%)`);
        }
    } else {
        errors.push('Team solve data is missing');
    }

    // Validate CSAT
    const csat = stats.csat?.week;
    if (csat) {
        if (csat.percentage < 0 || csat.percentage > 100) {
            errors.push(`Invalid CSAT percentage: ${csat.percentage}%`);
        }
        if (csat.totalRatings === 0 && csat.percentage !== 0) {
            warnings.push('CSAT shows percentage but no ratings');
        }
    }

    // Validate FRT
    const frtWeek = stats.frt?.week;
    if (frtWeek) {
        if (frtWeek.average < 0 || frtWeek.median < 0) {
            errors.push('Negative FRT values detected');
        }
        if (frtWeek.average > 1440) { // > 24 hours
            warnings.push(`Extremely high FRT average: ${frtWeek.average} minutes`);
        }
    }

    // Validate SLA
    const slaCompliance = stats.frt?.slaCompliance;
    if (slaCompliance !== undefined) {
        if (slaCompliance < 0 || slaCompliance > 100) {
            errors.push(`Invalid SLA compliance: ${slaCompliance}%`);
        }
    }

    // Validate leaderboard
    if (stats.leaderboard) {
        if (stats.leaderboard.length === 0 && teamSolves && teamSolves.week > 0) {
            warnings.push('Leaderboard is empty despite team having solves');
        }

        // Check for suspiciously high individual counts
        const totalTeamSolves = teamSolves?.week || 0;
        stats.leaderboard.forEach((leader, index) => {
            if (leader.count > totalTeamSolves) {
                errors.push(`Leader ${leader.name} has more solves than team total`);
            }
            if (index === 0 && leader.count > totalTeamSolves * 0.8) {
                warnings.push(`Top agent has ${Math.round((leader.count / totalTeamSolves) * 100)}% of all solves`);
            }
        });
    }

    // Validate chat volume
    const chatVolume = stats.chatVolume;
    if (chatVolume) {
        if (chatVolume.active < 0 || chatVolume.pending < 0 || chatVolume.snoozed < 0) {
            errors.push('Negative queue counts detected');
        }
    }

    return {
        isValid: errors.length === 0,
        warnings,
        errors,
        timestamp: Date.now()
    };
}

/**
 * Detects outliers and suspicious data patterns
 */
export function detectAnomalies(stats: IntercomStats | undefined): DataAnomalies {
    const outliers: DataAnomalies['outliers'] = [];
    const suspiciousPatterns: DataAnomalies['suspiciousPatterns'] = [];

    if (!stats) {
        return { outliers, suspiciousPatterns };
    }

    // Detect spikes in trends
    const weekTrend = stats.solved?.team?.weekTrend || 0;
    if (Math.abs(weekTrend) > 100) {
        outliers.push({
            metric: 'Weekly Solves Trend',
            value: weekTrend,
            expected: '±100%',
            severity: 'high'
        });
        suspiciousPatterns.push({
            pattern: 'Extreme Trend Spike',
            description: `Weekly solves changed by ${weekTrend > 0 ? '+' : ''}${weekTrend}%. Check for data quality issues or real operational changes.`
        });
    }

    // Detect CSAT drop
    const csatTrend = stats.csat?.trend || 0;
    if (csatTrend < -10) {
        outliers.push({
            metric: 'CSAT Trend',
            value: csatTrend,
            expected: '±10%',
            severity: 'medium'
        });
        suspiciousPatterns.push({
            pattern: 'CSAT Drop',
            description: `CSAT dropped by ${csatTrend}%. Review negative feedback remarks.`
        });
    }

    // Detect high FRT
    const frtAverage = stats.frt?.week?.average || 0;
    if (frtAverage > 120) { // > 2 hours
        outliers.push({
            metric: 'First Response Time',
            value: frtAverage,
            expected: '< 120 min',
            severity: 'high'
        });
    }

    // Detect low SLA compliance
    const slaCompliance = stats.frt?.slaCompliance || 100;
    if (slaCompliance < 80) {
        outliers.push({
            metric: 'SLA Compliance',
            value: slaCompliance,
            expected: '> 80%',
            severity: 'high'
        });
        suspiciousPatterns.push({
            pattern: 'Low SLA Compliance',
            description: `Only ${slaCompliance}% of conversations met SLA target. Investigate queue management.`
        });
    }

    // Detect imbalanced leaderboard (one person doing too much)
    if (stats.leaderboard && stats.leaderboard.length > 0) {
        const totalSolves = stats.solved?.team?.week || 1;
        const topAgentPercent = (stats.leaderboard[0].count / totalSolves) * 100;

        if (topAgentPercent > 60 && stats.leaderboard.length > 2) {
            suspiciousPatterns.push({
                pattern: 'Imbalanced Workload',
                description: `${stats.leaderboard[0].name} handled ${topAgentPercent.toFixed(0)}% of all tickets. Consider workload distribution.`
            });
        }
    }

    return { outliers, suspiciousPatterns };
}

/**
 * Format validation results for display
 */
export function formatValidationMessage(result: ValidationResult): string {
    if (result.isValid && result.warnings.length === 0) {
        return '✅ All data checks passed';
    }

    let message = '';

    if (result.errors.length > 0) {
        message += '❌ Errors:\n' + result.errors.map(e => `  - ${e}`).join('\n');
    }

    if (result.warnings.length > 0) {
        if (message) message += '\n\n';
        message += '⚠️  Warnings:\n' + result.warnings.map(w => `  - ${w}`).join('\n');
    }

    return message;
}

/**
 * Development mode: Log validation results to console
 */
export function logValidation(tier: TierType, stats: IntercomStats | undefined) {
    if (process.env.NODE_ENV !== 'development') return;

    const validation = validateStats(stats, tier);
    const anomalies = detectAnomalies(stats);

    console.groupCollapsed(`[Validator] ${tier} Data Quality Check`);
    console.log('Valid:', validation.isValid);

    if (validation.errors.length > 0) {
        console.error('Errors:', validation.errors);
    }

    if (validation.warnings.length > 0) {
        console.warn('Warnings:', validation.warnings);
    }

    if (anomalies.outliers.length > 0) {
        console.table(anomalies.outliers);
    }

    if (anomalies.suspiciousPatterns.length > 0) {
        anomalies.suspiciousPatterns.forEach(p => {
            console.log(`🔍 ${p.pattern}: ${p.description}`);
        });
    }

    console.groupEnd();
}
