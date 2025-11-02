import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld('electronAPI', {
    onShowPrompt: (callback: (data: { message: string; id: number }) => void) => {
        const listener = (_event: Electron.IpcRendererEvent, data: { message: string; id: number }) => {
            callback({ message: data.message, id: data.id })
        }

        ipcRenderer.on('show-prompt', listener)

        return () => {
            ipcRenderer.removeListener('show-prompt', listener)
        }
    },

    sendPromptResponse: (data: { id: number; value: string | null }) => {
        ipcRenderer.send('prompt-response', data)
    },

    onShowAlert: (callback: (message: string) => void) => {
        const listener = (_event: Electron.IpcRendererEvent, message: string) => {
            callback(message)
        }

        ipcRenderer.on('show-alert', listener)

        return () => {
            ipcRenderer.removeListener('show-alert', listener)
        }
    },

    addAccount: () => ipcRenderer.invoke('add-account'),
    getAccounts: () => ipcRenderer.invoke('get-accounts'),

    assignGroup: (accountId: string, groupId: string) => {
        return ipcRenderer.invoke('assign-group', { accountId, groupId })
    },

    broadcastMessage: (message: string, accountIds: string[], voiceData?: { name: string; base64: string }, videoData?: { name: string; base64: string }) => {
        return ipcRenderer.invoke('broadcast-message', { message, accountIds, voiceData, videoData })
    },

    checkForUpdates: () => ipcRenderer.invoke('check-for-updates')
})