const {
    contextBridge,
    ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld("api",{
    ipcSend: (channel, ...args) => ipcRenderer.send(channel, ...args),
    ipcOn: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args))
})