import * as path from "path"
import * as dotenv from "dotenv"
import { AuthManager } from "./telegram/authManager"
import { AccountManager } from "./telegram/AccountManager"
import { app, autoUpdater, BrowserWindow, dialog, ipcMain, screen } from "electron"

const envPath = app.isPackaged
    ? path.join(app.getAppPath(), '.env')
    : path.resolve(__dirname, '../../.env')

dotenv.config({ path: envPath })

let mainWindow: BrowserWindow | null = null

const createWindow = () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        titleBarStyle: 'hidden',

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

autoUpdater.on('checking-for-update', () => {
    console.log('Начало проверки обновлений')
})

autoUpdater.on('error', (error) => {
    console.error('Ошибка при обновлении!', error.message)
})

autoUpdater.on('update-not-available', () => {
    console.log('Нет подходящих обновлений')
})

autoUpdater.on('update-available', () => {
    console.log('Доступно обновление')
})

// autoUpdater.on('update-downloaded', () => {
//     autoUpdater.quitAndInstall()
// })

autoUpdater.on('update-downloaded', (event, releaseName) => {
    if (!mainWindow || mainWindow.isDestroyed()) return

    const message = `Доступна новая версия ${releaseName}.`
    const detail = 'Приложение будет перезапущено после установки.'

    dialog.showMessageBox(mainWindow, {
        type: 'info',
        buttons: ['Установить', 'Позже'],
        defaultId: 0,
        cancelId: 1,
        title: 'Обновление готово',
        message: message,
        detail: detail
    }).then(({ response }) => {
        if (response === 0) {
            setImmediate(() => autoUpdater.quitAndInstall())
        }
    })
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
    } else {
        console.log('[ DEV ]: Обновления работают только в упакованной версии')
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