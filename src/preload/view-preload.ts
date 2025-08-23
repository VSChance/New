import { contextBridge, ipcRenderer } from 'electron';

// Expose secure API to the BrowserView's web content
contextBridge.exposeInMainWorld('electronAPI', {
  sendToMain: (channel: string, data: any) => {
    // Whitelist allowed channels for security
    const allowedChannels = ['recorder:action', 'recorder:log', 'recorder:error'];
    if (allowedChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
});
