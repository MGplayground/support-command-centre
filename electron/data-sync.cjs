const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Get the App Group container path for macOS
const getSharedDataPath = () => {
    const homeDir = os.homedir();
    // This will be the shared location that the widget can read
    return path.join(homeDir, 'Library/Group Containers/group.supportcockpit.shared');
};

const SHARED_DATA_FILE = path.join(getSharedDataPath(), 'widget-data.json');

// Ensure the shared directory exists
async function ensureSharedDirectory() {
    const dir = path.dirname(SHARED_DATA_FILE);
    try {
        await fs.mkdir(dir, { recursive: true });
        console.log('✅ Shared directory created:', dir);
    } catch (err) {
        console.error('❌ Error creating shared directory:', err);
    }
}

// Import your API services (these will be available after build)
let getIntercomStats, getJiraTickets, getGamificationStats;

async function loadServices() {
    try {
        console.log('🔌 Connecting to live data services...');
        // Import live API handlers
        const { fetchIntercomStats } = require('./api-handlers.cjs');

        return {
            getIntercomStats: async () => {
                try {
                    return await fetchIntercomStats();
                } catch (e) {
                    console.error('Widget sync error:', e);
                    return null;
                }
            },
            // Placeholders for other services until fully migrated
            getJiraTickets: async () => ({ counts: { total: 0 }, tickets: [] }),
            getGamificationStats: () => ({ bonusAmount: 0, ticketsClosed: 0, isOnFire: false })
        };
    } catch (error) {
        console.error('Error loading services:', error);
        return null;
    }
}

// Calculate time remaining in a human-readable format - Legacy support
function formatSLATime(ms) {
    const minutes = Math.floor(ms / 60000);
    return `${minutes}m`;
}

// Fetch all data and export to shared location
async function fetchAndExportData() {
    try {
        console.log('🔄 Fetching data for widget...');

        // Load services if not already loaded
        if (!getIntercomStats) {
            const services = await loadServices();
            if (services) {
                getIntercomStats = services.getIntercomStats;
            } else {
                console.error('Failed to load services');
            }
        }

        // Fetch Intercom data
        const intercomStats = await getIntercomStats();

        // Calculate monthly completed (this maps to "completedMonth" in widget)
        const completedMonth = intercomStats?.solved?.personal?.month || 0;

        // Create widget-friendly data structure
        const widgetData = {
            lastUpdate: new Date().toISOString(),
            tickets: intercomStats?.chatVolume?.active || 0,
            slaWarnings: [],

            // New Fields for Widget Rework
            teamSolves: intercomStats?.solved?.team?.week || 0,
            personalSolves: intercomStats?.solved?.personal?.month || 0,
            aiStats: 0,

            // Enhanced Stats
            leaderboardPosition: null, // Nullable per Swift optional
            dailyAverage: Math.round((intercomStats?.solved?.personal?.month || 0) / new Date().getDate()),
            weeklyProgressPercent: Math.min(100, Math.round(((intercomStats?.solved?.personal?.week || 0) / 100) * 100)),

            completedMonth: completedMonth,
            quickSearchUrl: "supportcockpit://overview",

            // Keep detailed stats for main app
            stats: {
                intercom: {
                    totalChats: intercomStats?.solved?.team?.week || 0,
                    unassigned: intercomStats?.chatVolume?.unassigned || 0,
                    csatScore: intercomStats?.csat?.averageRating || 0,
                    active: intercomStats?.solved?.personal?.week || 0
                },
                jira: {
                    totalOpen: 0,
                    reviews: 0,
                    influence: 0,
                    boost: 0
                }
            }
        };

        // Update in-memory cache
        latestWidgetData = widgetData;

        // Write to shared location
        await fs.writeFile(
            SHARED_DATA_FILE,
            JSON.stringify(widgetData, null, 2),
            'utf8'
        );
        console.log('✅ Widget data exported');
        console.log(`   Personal: ${widgetData.personalSolves} | Team: ${widgetData.teamSolves}`);
    } catch (error) {
        console.error('❌ Error exporting widget data:', error);
    }
}

// Start the data sync service
function startDataSync() {
    console.log('🚀 Starting widget data sync service...');

    // Ensure directory exists
    ensureSharedDirectory().then(() => {
        // Initial export
        fetchAndExportData();

        // Refresh every 5 minutes
        const interval = setInterval(fetchAndExportData, 5 * 60 * 1000);

        console.log('⏰ Data sync scheduled every 5 minutes');

        return interval;
    });
}

// In-memory cache for AI Context
let latestWidgetData = null;

function getLatestStats() {
    return latestWidgetData;
}

module.exports = { startDataSync, fetchAndExportData, getLatestStats };
