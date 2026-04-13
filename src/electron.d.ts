// Type definitions for Electron API exposed in preload
export interface ElectronAPI {
    minimizeWindow: () => void;
    closeWindow: () => void;
    startDrag: (mousePos: { x: number; y: number }) => void;
    dragWindow: (mousePos: { x: number; y: number }) => void;
    endDrag: () => void;
    invokeAPI: (channel: string, ...args: any[]) => Promise<any>;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}

export { };
