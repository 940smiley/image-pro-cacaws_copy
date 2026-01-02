"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // File system operations
    readFile: (path) => electron_1.ipcRenderer.invoke('read-file', path),
    writeFile: (path, data) => electron_1.ipcRenderer.invoke('write-file', path, data),
    selectDirectory: () => electron_1.ipcRenderer.invoke('select-directory'),
    // System information
    getPlatform: () => process.platform,
    // Other APIs you want to expose
    on: (channel, listener) => {
        electron_1.ipcRenderer.on(channel, listener);
    },
    off: (channel, listener) => {
        electron_1.ipcRenderer.off(channel, listener);
    }
});
