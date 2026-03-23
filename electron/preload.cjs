const { contextBridge, ipcRenderer } = require('electron');

// Whitelist of allowed API channels (security)
const ALLOWED_API_CHANNELS = [
    'api:intercom-stats',
    'api:jira-tickets',
    'api:gemini-complete',
    'api:save-user-email',
    'api:get-user-email'
];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    // Window controls
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    closeWindow: () => ipcRenderer.send('window-close'),

    // Window dragging
    startDrag: (mousePos) => ipcRenderer.send('window-drag-start', mousePos),
    dragWindow: (mousePos) => ipcRenderer.send('window-drag', mousePos),
    endDrag: () => ipcRenderer.send('window-drag-end'),

    // Secure API calls (keys stay in main process)
    invokeAPI: (channel, ...args) => {
        if (ALLOWED_API_CHANNELS.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
        throw new Error(`API channel '${channel}' not allowed`);
    },
});
