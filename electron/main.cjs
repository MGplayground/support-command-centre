const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const { startDataSync } = require('./data-sync.cjs');

// Initialize secure API handlers (MUST be before window creation)
require('./api-handlers.cjs');

let mainWindow;
let tray = null;

// Disable macOS automatic window tabbing
if (process.platform === 'darwin') {
    app.dock.hide(); // Hide from dock since it's a menu bar app
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 420,
        height: 720,
        x: 100,
        y: 100,
        frame: false,
        transparent: true,
        titleBarStyle: 'hidden',
        hasShadow: false,
        vibrancy: 'under-window',
        visualEffectState: 'active',
        backgroundColor: '#00000000',
        show: false,
        alwaysOnTop: true, // Keep window on top to prevent widget blanking
        visibleOnAllWorkspaces: true, // Don't disappear when switching Spaces
        skipTaskbar: false,
        resizable: true,
        tabbingIdentifier: undefined,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false, // Keep updates running when not focused
        },
    });

    // Set window level to floating (above normal windows but below alerts)
    mainWindow.setAlwaysOnTop(true, 'floating');

    // Forward renderer console logs to main process terminal
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer] ${message}`);
    });

    // In development, load from Vite dev server
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        // In production, load from built files
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Window dragging
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    ipcMain.on('window-drag-start', (event, mousePos) => {
        isDragging = true;
        const windowPos = mainWindow.getPosition();
        dragOffset = {
            x: mousePos.x - windowPos[0],
            y: mousePos.y - windowPos[1]
        };
    });

    ipcMain.on('window-drag', (event, mousePos) => {
        if (isDragging) {
            mainWindow.setPosition(
                mousePos.x - dragOffset.x,
                mousePos.y - dragOffset.y
            );
        }
    });

    ipcMain.on('window-drag-end', () => {
        isDragging = false;
    });

    // Window controls
    ipcMain.on('window-minimize', () => {
        mainWindow.minimize();
    });

    ipcMain.on('window-close', () => {
        mainWindow.hide(); // Hide instead of close for menu bar app
    });
}

function createTray() {
    // Create a simple icon (you can replace with custom icon later)
    // For now, we'll create a template icon
    const iconPath = path.join(__dirname, 'assets/trayIconTemplate.png');

    // Check if icon exists, if not use a default
    try {
        tray = new Tray(iconPath);
    } catch (err) {
        // If custom icon doesn't exist, create a simple one
        console.log('Using default tray icon');
        // On macOS, we can use a template icon name
        tray = new Tray(path.join(__dirname, 'assets/trayIcon.png'));
    }

    // Set tooltip
    tray.setToolTip('Support Cockpit');

    // Create context menu
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Widget',
            click: () => {
                mainWindow.show();
                mainWindow.center();
            }
        },
        { type: 'separator' },
        {
            label: 'About',
            click: () => {
                // Could show an about dialog
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);

    // Toggle window on click
    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
            mainWindow.center();
            // Disable macOS native window tabbing
            if (process.platform === 'darwin') {
                mainWindow.setWindowButtonVisibility(false);
                // Additional macOS-specific tabbing disable
                try {
                    const win = mainWindow.getNativeWindowHandle();
                    if (win) {
                        mainWindow.excludedFromShownWindowsMenu = true;
                    }
                } catch (e) {
                    // Ignore if not available
                }
            }
        }
    });

    console.log('✅ Menu bar tray created');
}

app.whenReady().then(() => {
    // Remove the default Electron menu (including Help menu at top of screen)
    Menu.setApplicationMenu(null);

    createWindow();
    createTray();

    // Start the widget data sync service
    startDataSync();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        } else {
            mainWindow.show();
        }
    });
});

app.on('window-all-closed', () => {
    // Don't quit on window close for menu bar app
    // User must use "Quit" from tray menu
});

// Prevent app from quitting when window is closed
app.on('before-quit', () => {
    // Cleanup if needed
    console.log('App quitting...');
});


// ============================================================================
// DEEP LINK HANDLING (supportcockpit://)
// ============================================================================

// Register as default protocol client
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('supportcockpit', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('supportcockpit');
}

// Single Instance Lock (Focus existing app if opened again)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }

        // Handle deep link on Windows
        const url = commandLine.pop();
        handleDeepLink(url);
    });

    // Handle deep link on macOS
    app.on('open-url', (event, url) => {
        event.preventDefault();
        handleDeepLink(url);
    });
}

function handleDeepLink(url) {
    console.log('[DeepLink] Received:', url);
    if (!url) return;

    // Parse URL
    let pathName = '';
    try {
        const parsed = new URL(url);
        pathName = parsed.hostname + parsed.pathname; // e.g. "overview"
    } catch (e) {
        // Fallback simple parsing
        pathName = url.replace('supportcockpit://', '');
    }

    if (pathName === 'overview' || pathName === '') {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    }
}

// Set development mode flag
if (!app.isPackaged) {
    process.env.NODE_ENV = 'development';
}
