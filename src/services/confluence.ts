import { apiCache } from './api-cache';
import { mockConfluenceResults } from './__mocks__/api-responses';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const CONFLUENCE_URL = import.meta.env.VITE_CONFLUENCE_URL;
const CONFLUENCE_EMAIL = import.meta.env.VITE_CONFLUENCE_EMAIL;
const CONFLUENCE_TOKEN = import.meta.env.VITE_CONFLUENCE_TOKEN;
const CONFLUENCE_SPACE = import.meta.env.VITE_CONFLUENCE_SPACE || 'clearerio';

export interface ConfluenceResult {
    id: string;
    title: string;
    excerpt: string;
    url: string;
    content: string;
}

export async function searchConfluence(query: string): Promise<ConfluenceResult[]> {
    const cacheKey = `confluence:search:${query}`;

    // Check cache first
    const cached = apiCache.get<ConfluenceResult[]>(cacheKey);
    if (cached) {
        return cached;
    }

    // Use mock data if enabled
    if (USE_MOCK || !CONFLUENCE_URL || !CONFLUENCE_TOKEN) {
        apiCache.set(cacheKey, mockConfluenceResults);
        return mockConfluenceResults;
    }

    try {
        const auth = btoa(`${CONFLUENCE_EMAIL}:${CONFLUENCE_TOKEN}`);

        // Search using Confluence REST API
        const searchParams = new URLSearchParams({
            cql: `space=${CONFLUENCE_SPACE} AND text~"${query}"`,
            limit: '5',
            expand: 'body.view',
        });

        const response = await fetch(
            `${CONFLUENCE_URL}/wiki/rest/api/search?${searchParams}`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const data = await response.json();

        const results: ConfluenceResult[] = await Promise.all(
            (data.results || []).slice(0, 5).map(async (result: any) => {
                // Fetch full content for each result
                const contentRes = await fetch(
                    `${CONFLUENCE_URL}/wiki/rest/api/content/${result.content.id}?expand=body.storage`,
                    {
                        headers: {
                            'Authorization': `Basic ${auth}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                const contentData = await contentRes.json();

                // Strip HTML tags for plain text content
                const htmlContent = contentData.body?.storage?.value || '';
                const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

                return {
                    id: result.content.id,
                    title: result.content.title,
                    excerpt: result.excerpt || textContent.substring(0, 200) + '...',
                    url: `${CONFLUENCE_URL}/wiki${result.content._links.webui}`,
                    content: textContent,
                };
            })
        );

        apiCache.set(cacheKey, results);
        return results;

    } catch (error) {
        console.error('Error searching Confluence:', error);
        return mockConfluenceResults;
    }
}
