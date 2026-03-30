import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchHistoricalConversations } from '@/lib/databricks';
import { WebClient } from '@slack/web-api';

const SLACK_CACHE_TTL = 5 * 60 * 1000;
let slackCache = { data: '', fetchedAt: 0 };

async function fetchSlackKnowledge() {
    const token = process.env.SLACK_BOT_TOKEN;
    const channelIdsStr = process.env.SLACK_SUPPORT_CHANNEL_IDS;
    
    if (!token || !channelIdsStr) return '';
    
    if (Date.now() - slackCache.fetchedAt < SLACK_CACHE_TTL) {
        return slackCache.data;
    }
    
    const channelIds = channelIdsStr.split(',').map(id => id.trim()).filter(Boolean);
    const slack = new WebClient(token);
    
    try {
        const results = await Promise.all(
            channelIds.map(async (channelId) => {
                const res = await slack.conversations.history({ channel: channelId, limit: 50 });
                const msgs = (res.messages || [])
                    .filter(m => m.text && !m.subtype) // Ignore systemic messages
                    .map(m => `[Channel ${channelId}] ${m.text}`)
                    .join('\n');
                return msgs;
            })
        );
        
        const combined = results.join('\n\n---\n\n');
        slackCache = { data: combined, fetchedAt: Date.now() };
        return combined;
    } catch (e: any) {
        console.error('[AI Chat] Slack fetch failed:', e.message);
        return slackCache.data; // Stale fallback
    }
}

// Initialize Gemini
const apiKey = process.env.VITE_GEMINI_API_KEY;

export async function POST(req: Request) {
    if (!apiKey) {
        return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    try {
        const { message, context } = await req.json();

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // PRE-FLIGHT CHECK: Does the user want historical data?
        const preflightPrompt = `
        You are a search intent analyzer for a customer support AI. Read the user's question. 
        If the user is asking how to solve a problem (e.g. "how do we handle X", "what is the fix for Y", "how did we resolve Z"), extract the core topic and return ONLY a concise search phrase (1-3 words) to query a database of historical tickets. 
        Do NOT include filler words like "how to" or "fix". Just the topic (e.g., "billing error", "password reset", "login issue").
        If they are exclusively asking about dashboard metrics, agent stats, or CSAT scores without asking how to solve a problem, return the exact string "NO_SEARCH".

        User Question: ${message}
        `;
        const preflightResult = await model.generateContent(preflightPrompt);
        const searchIntent = preflightResult.response.text().trim();
        
        let historicalContext = '';
        
        if (searchIntent && searchIntent !== 'NO_SEARCH' && !searchIntent.includes('NO_SEARCH')) {
            console.log(`[AI Chat] Executing Knowledge Search for: "${searchIntent}"`);
            
            const [historicalTickets, recentSlackMsgs] = await Promise.all([
                searchHistoricalConversations(searchIntent).catch(e => {
                    console.error('[AI Chat] DB Search failed:', e);
                    return null;
                }),
                fetchSlackKnowledge().catch(e => {
                    console.error('[AI Chat] Slack fetch failed:', e);
                    return '';
                })
            ]);

            historicalContext = `
            ======================================================================
            [DATABRICKS HISTORICAL TICKETS FOR "${searchIntent}"]:
            ${historicalTickets && historicalTickets.length > 0 ? JSON.stringify(historicalTickets, null, 2) : 'None found.'}
            
            [RECENT SLACK DISCUSSIONS & WORKAROUNDS]:
            ${recentSlackMsgs ? recentSlackMsgs : 'No recent Slack discussions available.'}
            ======================================================================
            
            INSTRUCTIONS FOR SOLVING THE USER'S PROBLEM:
            The user is asking a troubleshooting question. 
            1. First check the RECENT SLACK DISCUSSIONS to see if the team has discussed this recently, as this will have the most up-to-date workarounds.
            2. Then check the DATABRICKS HISTORICAL TICKETS to see how it was solved before.
            3. Synthesize a clear, 3-step diagnosis and fix for the user. Explicitly cite "According to recent Slack discussions..." or "According to historical tickets..." where applicable.
            `;
        }

        const systemPrompt = `
    You are "Support AI", an advanced Intelligence Assistant for a Support Command Center.
    Your goal is to perform deep-dive analysis on real-time customer feedback and performance metrics.
    
    CURRENT MANIFEST & CONTEXT:
    ${JSON.stringify(context, null, 2)}
    ${historicalContext}
    
    CRITICAL INSTRUCTIONS FOR DATA PARSING:
    1.  **High Risk Accounts / Churn Drivers**: The context contains an array called \`churnRiskAccounts\`. This contains recent negative reviews classified by the Databricks AI. 
        -   Accounts are flagged if the AI determines the sentiment is negative OR if the customer explicitly mentions keywords like 'cancel', 'refund', 'frustrated', or 'unacceptable'.
        -   Each object has a \`churn_driver\` (e.g., 'technical bugs', 'pricing', 'onboarding', 'other').
        -   Each object has a \`review\` (the actual text from the customer).
        -   Each object has a \`customer_email\` and \`customer_name\`.
    2.  **Sentiment Breakdown**: Look at \`weeklyVolume.sentimentBreakdown\` for the overall proportion of positive, neutral, and negative interactions.
    
    HOW TO RESPOND:
    -   **Strict Sectioning**: Organize your response into clear sections using \`###\` headers (e.g., ### Summary, ### Historical Solution, ### Churn Risk).
    -   **Problem-Solution Format**: If answering a troubleshooting query, ALWAYS follow a structure of: \`### Problem\`, \`### Diagnosis\`, and \`### Recommended Fix\`.
    -   **Paragraph Limits**: Keep paragraphs to a maximum of 2 sentences. Use bullet points for additional details.
    -   **Analytical Results**: If the user asks for a summary or list of accounts, **ALWAYS use a Markdown Table** (| Customer | Review Snippet | Driver |).
    -   **Whitespace**: Use double-new-lines between every header and section.
    -   **Concision**: Be analytical and direct. Avoid long introductory filler.
    `;

        const result = await model.generateContent([
            systemPrompt,
            `User Question: ${message}`
        ]);

        const response = result.response;
        const text = response.text();

        return NextResponse.json({ text });
    } catch (error: any) {
        console.error('AI Chat Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate AI response', details: error.message },
            { status: 500 }
        );
    }
}
