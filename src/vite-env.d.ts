/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_OPENAI_API_KEY: string;
    readonly VITE_ANTHROPIC_API_KEY: string;
    readonly VITE_GEMINI_API_KEY: string;
    readonly VITE_INTERCOM_TOKEN: string;
    readonly VITE_JIRA_URL: string;
    readonly VITE_JIRA_EMAIL: string;
    readonly VITE_JIRA_TOKEN: string;
    readonly VITE_JIRA_PROJECTS: string;
    readonly VITE_CONFLUENCE_URL: string;
    readonly VITE_CONFLUENCE_EMAIL: string;
    readonly VITE_CONFLUENCE_TOKEN: string;
    readonly VITE_USE_MOCK_DATA: string;
    readonly VITE_SHOPIFY_STORE_URL: string;
    readonly VITE_SHOPIFY_ACCESS_TOKEN: string;
    readonly VITE_LLM_PROVIDER: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Electron IPC API types
interface ElectronAPI {
    minimizeWindow: () => void;
    closeWindow: () => void;
    startDrag: (mousePos: { x: number; y: number }) => void;
    dragWindow: (mousePos: { x: number; y: number }) => void;
    endDrag: () => void;
    // Secure API calls
    invokeAPI: (channel: 'api:intercom-stats' | 'api:jira-tickets' | 'api:gemini-complete' | 'api:save-user-email' | 'api:get-user-email', ...args: any[]) => Promise<any>;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}
