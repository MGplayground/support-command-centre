import OpenAI from 'openai';

const LLM_PROVIDER = import.meta.env.VITE_LLM_PROVIDER || 'gemini';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

// Initialize OpenAI client (only if using OpenAI)
const openai = OPENAI_API_KEY ? new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
}) : null;

// Simple in-memory cache to save tokens
const responseCache = new Map<string, string>();

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export async function generateCompletion(
    messages: LLMMessage[],
    onStream?: (chunk: string) => void
): Promise<string> {

    // 1. Check Cache (Optimization)
    const cacheKey = JSON.stringify(messages);
    if (!onStream && responseCache.has(cacheKey)) {
        console.log('⚡️ Serving from cache to save tokens');
        return responseCache.get(cacheKey)!;
    }

    let response = '';

    // 2. Route to Provider
    if (LLM_PROVIDER === 'gemini') {
        // Use secure IPC call to main process (API key stays hidden)
        response = await generateGeminiCompletion(messages);
    } else if (LLM_PROVIDER === 'openai' && openai) {
        response = await generateOpenAICompletion(messages, onStream);
    } else if (LLM_PROVIDER === 'anthropic' && ANTHROPIC_API_KEY) {
        response = await generateAnthropicCompletion(messages, onStream);
    } else {
        response = await generateMockCompletion(messages);
    }

    // 3. Save to Cache (Optimization)
    if (!onStream && response) {
        responseCache.set(cacheKey, response);
        // Limit cache size to 50 items to prevent memory leaks
        if (responseCache.size > 50) {
            const firstKey = responseCache.keys().next().value;
            if (firstKey) responseCache.delete(firstKey);
        }
    }

    return response;
}

async function generateGeminiCompletion(
    messages: LLMMessage[]
): Promise<string> {
    try {
        // Convert messages to a simple prompt for the main process
        let prompt = '';
        for (const msg of messages) {
            if (msg.role === 'system') {
                prompt += `System: ${msg.content}\n\n`;
            } else if (msg.role === 'user') {
                prompt += `User: ${msg.content}\n\n`;
            } else {
                prompt += `Assistant: ${msg.content}\n\n`;
            }
        }

        // Call main process API handler (API key stays completely secure)
        const result = await window.electron.invokeAPI('api:gemini-complete', prompt);
        return result.text || '';
    } catch (error) {
        console.error('Gemini completion error:', error);
        return await generateMockCompletion(messages);
    }
}


async function generateOpenAICompletion(
    messages: LLMMessage[],
    onStream?: (chunk: string) => void
): Promise<string> {
    try {
        if (onStream) {
            const stream = await openai!.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: messages as any,
                stream: true,
                temperature: 0.7,
            });

            let fullResponse = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                fullResponse += content;
                onStream(content);
            }
            return fullResponse;
        } else {
            const response = await openai!.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                messages: messages as any,
                temperature: 0.7,
            });
            return response.choices[0]?.message?.content || '';
        }
    } catch (error) {
        console.error('OpenAI API error:', error);
        throw error;
    }
}

async function generateAnthropicCompletion(
    messages: LLMMessage[],
    _onStream?: (chunk: string) => void
): Promise<string> {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY!,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-opus-20240229',
                messages: messages.filter(m => m.role !== 'system'),
                system: messages.find(m => m.role === 'system')?.content,
                max_tokens: 2048,
            }),
        });

        const data = await response.json();
        return data.content[0]?.text || '';
    } catch (error) {
        console.error('Anthropic API error:', error);
        throw error;
    }
}

function generateMockCompletion(messages: LLMMessage[]): Promise<string> {
    const userMessage = messages.find(m => m.role === 'user')?.content || '';

    // Simple mock response based on keywords
    if (userMessage.toLowerCase().includes('widget')) {
        return Promise.resolve(`I understand you're having issues with the widget. Based on the documentation, here are the troubleshooting steps:

1. **Check JavaScript Console**
   - Press F12 to open DevTools
   - Look for any JavaScript errors in the Console tab
   - Common errors include jQuery conflicts or missing dependencies

2. **Verify Widget Placement**
   - Ensure the widget code is placed before the closing </body> tag
   - Check if your theme has specific placement requirements

3. **Clear Cache**
   - Clear your browser cache (Cmd+Shift+R / Ctrl+Shift+F5)
   - If using a CDN, clear the CDN cache as well

4. **Inspect Elements**
   - Use the Elements tab in DevTools to confirm the widget HTML is present
   - Check the Network tab to verify widget assets are loading correctly

If these steps don't resolve the issue, please provide the specific error messages from the console.`);
    } else if (userMessage.toLowerCase().includes('discount')) {
        return Promise.resolve(`Let's debug this discount code issue systematically:

1. **Verify Code Validity**
   - Check start and end dates
   - Confirm usage limits haven't been exceeded
   - Ensure the code is active

2. **Check Requirements**
   - Minimum purchase amount met?
   - Product/collection restrictions satisfied?
   - Customer eligibility (new vs returning)

3. **Look for Conflicts**
   - Other discounts already applied?
   - Incompatible discount combinations?
   - Session cookie issues?

Try these steps and let me know what you find. If the issue persists, check the admin panel for any error logs.`);
    }

    return Promise.resolve(`I'm here to help with your technical support query. Based on the available documentation, I can provide step-by-step troubleshooting guidance. Could you please provide more specific details about the issue you're experiencing?`);
}
