import { apiCache } from './api-cache';
import { mockJiraData } from './__mocks__/api-responses';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';

interface JiraTicket {
    project: string;
    key: string;
    summary: string;
    status: string;
    priority: string;
    slaTimeRemaining: number; // milliseconds
    assignee: string;
}

interface JiraData {
    tickets: JiraTicket[];
    counts: Record<string, number> & { total: number };
}

export async function getJiraTickets(): Promise<JiraData> {
    const cacheKey = 'jira:tickets';

    // Check cache first
    const cached = apiCache.get<JiraData>(cacheKey);
    if (cached) {
        return cached;
    }

    // Use mock data if enabled
    if (USE_MOCK) {
        apiCache.set(cacheKey, mockJiraData);
        return mockJiraData;
    }

    try {
        // Call main process API handler (keys stay secure)
        const jiraData = await window.electron.invokeAPI('api:jira-tickets');
        apiCache.set(cacheKey, jiraData);
        return jiraData;
    } catch (error) {
        console.error('Error fetching Jira tickets:', error);
        return mockJiraData;
    }
}
