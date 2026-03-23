import { searchConfluence, type ConfluenceResult } from './confluence';
import { generateCompletion, type LLMMessage } from './llm';

const SYSTEM_PROMPT = `You are a Senior Tier 3 Engineer at a SaaS support company. Your role is to provide expert technical troubleshooting guidance based STRICTLY on the retrieved Confluence documentation.

CRITICAL RULES:
1. Answer ONLY based on the Confluence documentation provided in the context
2. If the documentation doesn't contain the answer, DO NOT make assumptions or use external knowledge
3. If you cannot find the answer in the docs, respond with:
   "I don't see this specific issue covered in our documentation. I recommend escalating this to the [App Name] Dev Team for further investigation."
4. When you do find relevant information, provide step-by-step technical solutions
5. Reference specific documentation sections when applicable
6. Use technical terminology appropriately
7. Include verification steps after suggesting fixes

FORMAT YOUR RESPONSES AS:
- Clear numbered steps for troubleshooting
- Code snippets or commands when relevant
- Verification checkpoints
- Escalation path if the docs don't cover the issue

Your goal is to help support agents resolve technical issues efficiently using our internal knowledge base.`;

export interface RAGResponse {
    answer: string;
    sources: ConfluenceResult[];
}

export async function queryRAG(
    userQuery: string,
    onStream?: (chunk: string) => void
): Promise<RAGResponse> {
    try {
        // Step 1: Retrieve relevant documentation from Confluence
        const sources = await searchConfluence(userQuery);

        if (sources.length === 0) {
            // No documentation found
            const messages: LLMMessage[] = [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `The support agent asks: "${userQuery}"\n\nNo relevant documentation was found. Provide general troubleshooting guidance based on common support scenarios.`
                },
            ];

            const answer = await generateCompletion(messages, onStream);
            return { answer, sources: [] };
        }

        // Step 2: Build context from top results
        const context = sources.map((doc, idx) =>
            `[Document ${idx + 1}: ${doc.title}]\n${doc.content.substring(0, 1000)}`
        ).join('\n\n---\n\n');

        // Step 3: Generate augmented prompt with retrieved context
        const messages: LLMMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: `The support agent asks: "${userQuery}"

I've retrieved the following relevant documentation from our knowledge base:

${context}

Based on this documentation, provide a clear, step-by-step troubleshooting answer. Reference specific sections from the docs when applicable.`,
            },
        ];

        // Step 4: Generate completion
        const answer = await generateCompletion(messages, onStream);

        return { answer, sources };

    } catch (error) {
        console.error('RAG query error:', error);
        throw error;
    }
}

// Helper function for follow-up questions
export async function followUpQuery(
    previousMessages: LLMMessage[],
    newQuery: string,
    onStream?: (chunk: string) => void
): Promise<string> {
    const messages: LLMMessage[] = [
        ...previousMessages,
        { role: 'user', content: newQuery },
    ];

    return generateCompletion(messages, onStream);
}
