import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { GoogleGenerativeAI } from '@google/generative-ai';

async function main() {
    const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const message = "How do we solve billing issues?";
    const preflightPrompt = `
You are a search intent analyzer. Read the user's question. If they are asking about how to solve a specific issue, or inquiring about past solutions/tickets, return ONLY a concise search phrase (1-3 words) to query our database of historical tickets. 
If they are just asking broadly about metrics, or not about a specific problem, return the exact string "NO_SEARCH".

User Question: ${message}
`;
    const preflightResult = await model.generateContent(preflightPrompt);
    console.log('Search Intent:', preflightResult.response.text());
}
main();
