import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  writeFile: (path: string, data: string) => ipcRenderer.invoke('write-file', path, data),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  // System information
  getPlatform: () => process.platform,

  // Other APIs you want to expose
  on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => {
    ipcRenderer.on(channel, listener);
  },
  off: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => {
    ipcRenderer.off(channel, listener);
  }
});