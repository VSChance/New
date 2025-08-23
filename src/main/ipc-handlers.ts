import { ipcMain, BrowserWindow } from 'electron';
import { browserViewManager } from './browser-view-manager';

export function registerRecorderHandlers() {
  // BrowserView management
  ipcMain.on('browser:create', (event) => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    if (parentWindow) {
      browserViewManager.createBrowserView(parentWindow);
    }
  });

  ipcMain.on('browser:destroy', () => {
    browserViewManager.destroyBrowserView();
  });

  ipcMain.on('browser:set-bounds', (_, bounds) => {
    browserViewManager.setBounds(bounds);
  });

  ipcMain.on('browser:navigate', (_, url) => {
    browserViewManager.navigate(url);
  });

  ipcMain.on('browser:back', () => {
    browserViewManager.goBack();
  });

  ipcMain.on('browser:forward', () => {
    browserViewManager.goForward();
  });

  ipcMain.on('browser:reload', () => {
    browserViewManager.reload();
  });

  ipcMain.on('browser:start-recording', (_, mode) => {
    browserViewManager.startRecording(mode);
  });

  ipcMain.on('browser:stop-recording', () => {
    browserViewManager.stopRecording();
  });

  ipcMain.handle('browser:screenshot', async () => {
    return await browserViewManager.captureScreenshot();
  });

  ipcMain.handle('browser:detect-elements', async () => {
    return await browserViewManager.detectElements();
  });

  ipcMain.handle('browser:execute-script', async (_, script) => {
    return await browserViewManager.executeScript(script);
  });

  // Forward actions from BrowserView to renderer
  ipcMain.on('recorder:action', (event, action) => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send('recorder:action', action);
    }
  });

  ipcMain.on('recorder:quick-add', (event, action) => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send('recorder:action', action);
    }
  });
}
