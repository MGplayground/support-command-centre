// Secure API Handlers - Main Process Only
// API keys never leave this file, completely hidden from renderer
const { ipcMain } = require('electron');
const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config();

// ============================================================================
// INTERCOM API HANDLER
// ============================================================================
// HACK: Manual Map for when Token lacks 'read_admins' permission
const MANUAL_ADMIN_MAP = {
    '7706965': { name: 'Mauro (T2 UK)', avatar: null },
    '8215044': { name: 'Jenson (T1 UK)', avatar: null },
    '8853567': { name: 'Luke (T1 UK)', avatar: null },
    '8867005': { name: 'Ash (T1 UK)', avatar: null },
    '6500257': { name: 'Maddox (T1 UK)', avatar: null },
    '8424076': { name: 'Luna (T1 Vietnam)', avatar: null },
    '6722239': { name: 'Trilok (T1 America)', avatar: null },
    '6500282': { name: 'Daniel (T2 UK)', avatar: null },
    '5461719': { name: 'Leila (T1 America)', avatar: null },
    '3669480': { name: 'Moll (Team Leader UK)', avatar: null },
    '8219930': { name: 'Manvir (T2 UK)', avatar: null },
    '7365787': { name: 'Khalil (T2 UK)', avatar: null }
};


// Data transformation to reduce payload size
function transformConversationData(conversations) {
    if (!conversations || !Array.isArray(conversations)) return [];

    return conversations.map(conv => ({
        id: conv.id,
        state: conv.state,
        updated_at: conv.updated_at,
        admin_assignee_id: conv.admin_assignee_id,
        conversation_rating: conv.conversation_rating,
        statistics: conv.statistics, // Use pre-calculated Intercom metrics
        snoozed_until: conv.snoozed_until,
        waiting_since: conv.waiting_since
    }));
}




// Exported function for data sync
async function fetchIntercomStats() {
    const INTERCOM_TOKEN = process.env.VITE_INTERCOM_TOKEN;

    if (!INTERCOM_TOKEN) {
        throw new Error('INTERCOM_TOKEN not configured');
    }

    try {
        const now = new Date();

        // Start of Week (Monday)
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfWeekTs = Math.floor(startOfWeek.getTime() / 1000);

        // Start of Month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfMonthTs = Math.floor(startOfMonth.getTime() / 1000);

        // 1. Resolve Admin Identity
        let adminMap = new Map();
        // Updated Manual Map with Emails for fallback
        const ENRICHED_MANUAL_MAP = {
            '7706965': { name: 'Mauro (T2 UK)', email: 'mauro@clearer.io', avatar: null },
            '8215044': { name: 'Jenson (T1 UK)', email: 'jenson@clearer.io', avatar: null },
            // ... others can be added as needed
            ...MANUAL_ADMIN_MAP
        };

        Object.entries(ENRICHED_MANUAL_MAP).forEach(([id, data]) => adminMap.set(id, data));

        try {
            const adminsData = await makeIntercomRequest('/admins', {}, 'GET');
            if (adminsData?.admins) {
                adminsData.admins.forEach(admin => {
                    adminMap.set(admin.id, {
                        name: admin.name,
                        email: admin.email,
                        avatar: admin.avatar?.image_url
                    });
                });
            }
        } catch (e) { console.warn('Admin fetch failed, using manual map', e); }

        const myEmail = await getUserEmail();
        let myAdminId = null;

        if (myEmail) {
            const normalizedEmail = myEmail.toLowerCase();
            const namePart = normalizedEmail.split('@')[0];

            for (const [id, admin] of adminMap.entries()) {
                const adminName = admin.name?.toLowerCase() || '';
                const adminEmail = admin.email?.toLowerCase();

                // 1. Exact Email Match
                if (adminEmail === normalizedEmail) {
                    myAdminId = id;
                    break;
                }

                // 2. Name contains email prefix (e.g. "Mauro" in "mauro@...")
                if (adminName.includes(namePart)) {
                    myAdminId = id;
                    break;
                }

                // 3. Admin Name part matches (e.g. "Mauro (T2 UK)" starts with "mauro")
                if (namePart && adminName.startsWith(namePart)) {
                    myAdminId = id;
                    break;
                }
            }
        }

        console.log(`[Intercom] Resolved Identity: ${myAdminId} (${myEmail})`);

        // 2. Build CSAT Query (Updated Logic: Requests sent in window, score can be null)
        const buildCsatQuery = (sinceTs) => ({
            operator: 'AND',
            value: [
                { field: 'conversation_rating.requested_at', operator: '>', value: sinceTs }
            ]
        });

        // 3. Build Solve Query (Broad Team Fetch)
        const buildSolveQuery = (sinceTs, adminId = null) => {
            const rules = [
                { field: 'state', operator: '=', value: 'closed' },
                { field: 'updated_at', operator: '>', value: sinceTs }
            ];
            if (adminId) {
                // For direct fetch fallback
                rules.push({ field: 'statistics.last_closed_by_id', operator: '=', value: adminId });
            }
            return { operator: 'AND', value: rules };
        };

        // DEBUG: Date Filter Bypass Query
        const buildDebugQuery = () => ({
            operator: 'AND',
            value: [
                { field: 'state', operator: '=', value: 'closed' }
            ]
        });

        // 4. Sequential Fetching (Refactored to fail-safe against timeouts)
        // Store FUNCTIONS that return promises, so they don't start immediately
        const taskDefinitions = [
            // DEBUG: Bypass Date Filter for Team Week slot (Last 50 closed) - Primary Data Source if Month fails
            () => makeIntercomRequest('/conversations/search', { query: buildDebugQuery(), pagination: { per_page: 50 } }),
            () => makeIntercomRequest('/conversations/search', { query: buildSolveQuery(startOfMonthTs), pagination: { per_page: 50 } }), // Reduced from 150 to 50 to prevent timeout
            () => makeIntercomRequest('/conversations/search', { query: buildCsatQuery(startOfWeekTs) }),
            () => makeIntercomRequest('/conversations/search', { query: buildCsatQuery(startOfMonthTs) }),
        ];

        if (myAdminId) {
            // Fetch "My Solves" based on closing action (Personal Fetch, reduced page size)
            taskDefinitions.push(() => makeIntercomRequest('/conversations/search', { query: buildSolveQuery(startOfWeekTs, myAdminId), pagination: { per_page: 50 } }));
            taskDefinitions.push(() => makeIntercomRequest('/conversations/search', { query: buildSolveQuery(startOfMonthTs, myAdminId), pagination: { per_page: 50 } }));

            // Also fetch Active conversations for "My Work" pie chart
            taskDefinitions.push(() => makeIntercomRequest('/conversations/search', {
                query: {
                    operator: 'AND',
                    value: [
                        { field: 'state', operator: '=', value: 'open' },
                        { field: 'admin_assignee_id', operator: '=', value: myAdminId }
                    ]
                },
                pagination: { per_page: 50 }
            }));
        }

        // Execute sequentially
        const results = [];
        for (const [index, task] of taskDefinitions.entries()) {
            console.log(`[Intercom] Running Fetch Task ${index + 1}/${taskDefinitions.length}...`);
            try {
                const result = await task();
                results.push(result);
            } catch (err) {
                console.error(`[Intercom] Task ${index + 1} Failed:`, err.message);
                results.push({ total_count: 0, conversations: [] }); // Fallback
            }
        }

        const [teamWeek, teamMonth, csatWeek, csatMonth] = results;

        console.log(`[Intercom Stats] Week Count: ${teamWeek?.total_count}, Month Count: ${teamMonth?.total_count}`);

        // Extract My Data from results (if myAdminId exists, they are at index 4, 5, 6)
        const myWeek = myAdminId ? results[4] : { total_count: 0, conversations: [] };
        const myMonth = myAdminId ? results[5] : { total_count: 0, conversations: [] };
        const myActive = myAdminId ? results[6] : { conversations: [] };

        // 5. Processing Stats

        // Helper: Is Valid Solve (Closed in Window) using last_close_at
        const isClosedInWindow = (conv, startTs) => {
            const closedAt = conv.statistics?.last_close_at || conv.updated_at;
            return closedAt > startTs;
        };

        // Helper: Participation Check (Teammates or Assignee)
        const userParticipated = (conv, adminId) => {
            if (!adminId) return false;
            // Direct checks
            if (conv.admin_assignee_id == adminId) return true;
            if (conv.statistics?.last_closed_by_id == adminId) return true;
            // Teammates array check
            if (conv.teammates && Array.isArray(conv.teammates)) {
                return conv.teammates.some(t => t.id == adminId);
            }
            return false;
        };

        // Personal Solves Calculation
        // Step 1: Count directly closed (Reliable)
        const myDirectWeek = myWeek?.total_count || 0;
        const myDirectMonth = myMonth?.total_count || 0;

        // Step 2: Attempt to broaden with "Teammates" filtering from Team List (Subject to pagination limits)
        const myParticipatedWeek = teamWeek?.conversations?.filter(c => isClosedInWindow(c, startOfWeekTs) && userParticipated(c, myAdminId)).length || 0;
        const myParticipatedMonth = teamMonth?.conversations?.filter(c => isClosedInWindow(c, startOfMonthTs) && userParticipated(c, myAdminId)).length || 0;

        // Final: Use the MAX to ensure we don't zero out due to pagination
        const myWeekCount = Math.max(myDirectWeek, myParticipatedWeek);
        const myMonthCount = Math.max(myDirectMonth, myParticipatedMonth);

        // Team Stats (Raw Count from broad query)
        const teamWeekCountTotal = teamWeek?.total_count || 0;
        const teamMonthCountTotal = teamMonth?.total_count || 0;

        // Leaderboard - Merge Sources!
        const leaderboard = {};
        // Combine Week and Month conversations to catch everyone, especially if Month timed out
        const allConversations = [
            ...(teamMonth?.conversations || []),
            ...(teamWeek?.conversations || []) // Fallback / Augment with Task 1 results
        ];

        const transformedConversations = transformConversationData(allConversations);

        if (transformedConversations.length > 0) {
            transformedConversations.forEach(conv => {
                // Use looser "Updated At" here since we are just building a list of active agents
                const closerId = conv.statistics?.last_closed_by_id;
                if (closerId) {
                    const sCloserId = String(closerId);
                    if (!leaderboard[sCloserId]) {
                        leaderboard[sCloserId] = {
                            id: sCloserId,
                            name: adminMap.get(sCloserId)?.name || `Agent ${sCloserId}`,
                            avatar: adminMap.get(sCloserId)?.avatar,
                            count: 0
                        };
                    }
                    leaderboard[sCloserId].count++;
                }
            });
        }

        // DEBUG: Force Leaderboard Entry logic (ONLY IF EMPTY)
        if (Object.keys(leaderboard).length === 0 && !leaderboard['7706965']) {
            leaderboard['7706965'] = {
                id: '7706965',
                name: 'Mauro (Debug Force)',
                avatar: null,
                count: 1
            };
        }

        const leaderboardArray = Object.values(leaderboard).sort((a, b) => b.count - a.count);

        // CSAT Stats (Pending Logic)
        const processCSAT = (conversations) => {
            if (!conversations) return { percentage: 0, positiveRatings: 0, totalRatings: 0, pending: 0, remarks: [] };

            // Total Requested (All fetched)
            const allRequests = conversations;
            // Rated = Score exists
            const ratedConvs = allRequests.filter(c => c.conversation_rating?.score != null);
            const pendingConvs = allRequests.filter(c => c.conversation_rating?.score == null);

            const total = ratedConvs.length;
            const positive = ratedConvs.filter(c => c.conversation_rating.score >= 4).length;

            const remarks = ratedConvs
                .filter(c => c.conversation_rating.score <= 3)
                .map(c => ({
                    id: c.id,
                    score: c.conversation_rating.score,
                    remark: c.conversation_rating.remark || 'No remark left.',
                    created_at: c.conversation_rating.created_at,
                    customer: 'Customer'
                }))
                .sort((a, b) => b.created_at - a.created_at);

            return {
                percentage: total ? Math.round((positive / total) * 100) : 0,
                positiveRatings: positive,
                totalRatings: total,
                pending: pendingConvs.length,
                remarks
            };
        };

        // Conversation States
        const conversationStates = { open: 0, snoozed: 0, pending: 0 };
        if (myActive?.conversations) {
            myActive.conversations.forEach(conv => {
                if (conv.snoozed_until) conversationStates.snoozed++;
                else if (conv.waiting_since) conversationStates.pending++;
                else conversationStates.open++;
            });
        }

        const stats = {
            solved: {
                personal: {
                    week: myWeekCount,
                    month: myMonthCount
                },
                team: {
                    week: teamWeekCountTotal,
                    month: teamMonthCountTotal
                }
            },
            leaderboard: leaderboardArray.slice(0, 5),
            chatVolume: {
                closed_month: teamMonthCountTotal,
                total: teamWeekCountTotal,
                active: conversationStates.open + conversationStates.snoozed + conversationStates.pending,
                unassigned: 0
            },
            conversationStates,
            csat: {
                week: processCSAT(csatWeek?.conversations),
                month: processCSAT(csatMonth?.conversations)
            }
        };

        return stats;

    } catch (error) {
        console.error('Intercom API error:', error);
        throw error;
    }
}

function makeIntercomRequest(path, body = {}, method = 'POST') {
    return new Promise((resolve, reject) => {
        // Data Transformation: Use Version 2.14 for updated handling
        const data = JSON.stringify(body);
        const options = {
            hostname: 'api.intercom.io',
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${process.env.VITE_INTERCOM_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Intercom-Version': '2.14',
            },
        };

        if (method !== 'GET') {
            options.headers['Content-Length'] = data.length;
        }

        console.log(`[Intercom Request] Starting ${method} ${path}`);

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                console.log(`[Intercom Request] Finished ${path} Status: ${res.statusCode}`);
                try {
                    const json = JSON.parse(responseData);
                    // Logging for Debugging
                    if (json.conversations && json.conversations.length === 0) {
                        console.log(`[Intercom Debug] Empty results for ${path}`, JSON.stringify(body));
                    }
                    if (json.errors) {
                        console.error(`[Intercom Debug] API Error for ${path}:`, JSON.stringify(json.errors));
                    }
                    resolve(json);
                } catch (e) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });

        // Timeout Protection against Hanging Requests
        req.setTimeout(10000, () => {
            console.error(`[Intercom Request] TIMEOUT ${path}`);
            req.destroy();
            reject(new Error(`Request timed out after 10s for ${path}`));
        });

        req.on('error', (err) => {
            console.error(`[Intercom Request] Network Error ${path}:`, err.message);
            reject(err);
        });

        if (method !== 'GET') req.write(data);
        req.end();
    });
}

ipcMain.handle('api:intercom-stats', async () => {
    return await fetchIntercomStats();
});



// Jira API handler removed as per user request to focus on Intercom.


// ============================================================================
// GEMINI API HANDLER
// ============================================================================
const { getLatestStats } = require('./data-sync.cjs');

// ... (Environment loading remains)

// ============================================================================
// GEMINI STATS ASSISTANT HANDLER
// ============================================================================
ipcMain.handle('api:gemini-complete', async (event, prompt, options = {}) => {
    const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    try {
        const stats = getLatestStats();
        console.log('[AI Assistant] Prompt:', prompt);
        console.log('[AI Assistant] Stats Context:', JSON.stringify(stats, null, 2));

        let systemContext = `
        You are "Support AI", a helpful assistant for a Tier 2 Support Agent.
        Your goal is to help the agent understand their performance stats and answer questions.
        
        CURRENT TEAM PROGRESS (Intercom):
        - Your Solves (Month): ${stats?.personalSolves || 0}
        - Team Solves (Week): ${stats?.teamSolves || 0}
        - Leaderboard (Top 5): ${JSON.stringify(stats?.stats?.intercom?.leaderboard || [])}
        
        Instructions:
        - Use the stats above to answer questions about progress.
        - Be professional and concise (under 3 sentences).
        - If asked about "my solves", refer to "Your Solves".
        - If asked what questions you can answer, provide this list:
          * "How many tickets have I solved this month?"
          * "What's the team's progress this week?"
          * "Who are the top performers on the leaderboard?"
          * "What's my daily average for solves?"
          * "How am I tracking compared to last month?"
        `;

        const requestBody = {
            contents: [{
                parts: [{ text: systemContext + "\n\nUser Question: " + prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
            },
        };

        console.log('[AI Assistant] Requesting Gemini (flash-latest)...');
        const data = await makeGeminiRequest('/v1beta/models/gemini-flash-latest:generateContent', requestBody, GEMINI_API_KEY);
        console.log('[AI Assistant] Response Data:', JSON.stringify(data, null, 2));

        if (data.error) {
            throw new Error(`Gemini API error: ${data.error.message}`);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ||
            "I'm sorry, I couldn't generate a response. Please try rephrasing.";
        return { text };

    } catch (error) {
        console.error('Gemini API error:', error);
        throw error;
    }

    function makeGeminiRequest(path, body, apiKey) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(body);
            const options = {
                hostname: 'generativelanguage.googleapis.com',
                path: `${path}?key=${apiKey}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length,
                },
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(responseData));
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }
});




console.log('✅ Secure API handlers registered');

// ============================================================================
// USER EMAIL STORAGE (For Team Distribution)
// ============================================================================
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const USER_CONFIG_FILE = path.join(app.getPath('userData'), 'user-config.json');

// Save user email
ipcMain.handle('api:save-user-email', async (event, email) => {
    try {
        const config = { email, configuredAt: new Date().toISOString() };
        await fs.promises.writeFile(USER_CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log('✅ User email saved:', email);
        return { success: true };
    } catch (error) {
        console.error('Failed to save user email:', error);
        throw error;
    }
});

// Get user email
ipcMain.handle('api:get-user-email', async () => {
    try {
        const data = await fs.promises.readFile(USER_CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        return config.email;
    } catch (error) {
        // File doesn't exist yet (first launch)
        return null;
    }
});

// Helper function to get configured email (for use in other handlers)
async function getUserEmail() {
    try {
        const data = await fs.promises.readFile(USER_CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        return config.email;
    } catch (error) {
        return null;
    }
}

module.exports = { getUserEmail, fetchIntercomStats };
