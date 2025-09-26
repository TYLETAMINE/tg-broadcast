import { BrowserWindow, ipcMain } from "electron"

export class MessageBox {
    private static nextId = 1

    static async prompt(message: string): Promise<string | null> {
        const mainWindow = BrowserWindow.getAllWindows()[0]

        if (!mainWindow) return null

        const requestId = MessageBox.nextId++

        return new Promise<string | null>((resolve) => {
            mainWindow.webContents.send('show-prompt', { message, id: requestId })

            const handler = (event: Electron.IpcMainEvent, data: { id: number; value: string | null }) => {
                if (data.id === requestId) {
                    resolve(data.value)
                    ipcMain.removeListener('prompt-response', handler)
                }
            }

            ipcMain.on('prompt-response', handler)

            setTimeout(() => {
                ipcMain.removeListener('prompt-response', handler)
                resolve(null)
            }, 300_000)
        })
    }

    static async alert(message: string): Promise<void> {
        const mainWindow = BrowserWindow.getAllWindows()[0]

        if (mainWindow) {
            mainWindow.webContents.send('show-alert', message)
        }
    }
}