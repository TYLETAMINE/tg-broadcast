require('@dotenvx/dotenvx').config()

import { AuthManager } from "./telegram/authManager"
import { AccountManager } from "./telegram/AccountManager"
import { app, autoUpdater, BrowserWindow, ipcMain, screen } from "electron"
import * as path from "path"

let mainWindow: BrowserWindow | null = null

const createWindow = () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: path.join(__dirname, '../preload/preload.js')
        }
    })

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    // mainWindow.webContents.openDevTools()

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

const API_ID = parseInt(process.env.API_ID || '')
const API_HASH = process.env.API_HASH || ''

const authManager = new AuthManager(API_ID, API_HASH)
const accountManager = new AccountManager(authManager)

ipcMain.on('prompt-response', (event, data) => { })

autoUpdater.on('update-available', () => {
    console.log('Доступно обновление');
})

autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall()
})

app.whenReady().then(async () => {
    createWindow();

    ipcMain.handle('add-account', async () => {
        const account = await accountManager.addAccount()
        return account
    })

    ipcMain.handle('get-accounts', async () => {
        return accountManager.getAccounts()
    })

    ipcMain.handle('assign-group', async (_event, { accountId, groupId }) => {
        const success = await accountManager.assignGroupToAccount(accountId, groupId)
        return success
    })

    ipcMain.handle('broadcast-message', async (_event, { message, accountIds, voiceData, videoData }) => {
        await accountManager.broadcastMessage(message, accountIds, voiceData, videoData)
        return { success: true }
    })

    if (app.isPackaged) {
        autoUpdater.checkForUpdates()
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    })

    app.on('before-quit', async () => {
        await accountManager.disconnectAllClients()
    })
})