import { AuthManager } from "./authManager"
import { TelegramClient } from "telegram"
import * as fs from "fs"
import * as path from "path"
import { Api } from "telegram"
import { app } from "electron"

const ACCOUNTS_FILE = path.join(app.getPath('userData'), 'accounts.json')

export class AccountManager {
    private authManager: AuthManager
    private accounts: Account[] = []
    private clients: Map<string, TelegramClient> = new Map()

    constructor(authManager: AuthManager) {
        this.authManager = authManager
        this.loadAccounts()
    }

    private loadAccounts() {
        try {
            if (fs.existsSync(ACCOUNTS_FILE)) {
                const raw = fs.readFileSync(ACCOUNTS_FILE, 'utf-8')
                const data = JSON.parse(raw)
                this.accounts = data.accounts || []
            }
        } catch (error) {
            console.error('Ошибка при загрузке accounts.json:', error)
            this.accounts = []
        }
    }

    private saveAccounts() {
        try {
            const data = { accounts: this.accounts }
            fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2), 'utf-8')
            console.log('accounts.json сохранен')
        } catch (error) {
            console.error('Ошибка при сохранении accounts.json:', error)
        }
    }

    async addAccount(): Promise<Account | null> {
        const sessionName = `account_${Date.now()}`
        const client = await this.authManager.createClient(sessionName)

        const me = await client.getMe()

        const newAccount: Account = {
            id: sessionName,
            sessionName,
            phoneNumber: '',
            username: me.username || '',
            assignedGroups: [],
            isActive: true
        }

        this.accounts.push(newAccount)
        this.clients.set(sessionName, client)
        this.saveAccounts()

        console.log(`Аккаунт @${me.username} добавлен!`)
        return newAccount
    }

    getAccounts() {
        return this.accounts
    }

    async assignGroupToAccount(accountId: string, groupId: string): Promise<boolean> {
        const account = this.accounts.find(a => a.id === accountId)
        if (!account) return false

        const client = this.clients.get(account.sessionName)
        if (!client) {
            // Добавить кэширование группы при добавлении акка
            return false
        }

        try {
            const entity = await client.getEntity(groupId)
            if (!(entity instanceof Api.Channel) && !(entity instanceof Api.Chat)) {
                throw new Error('Это не канал/группа')
            }

            const groupInfo = {
                id: groupId,
                title: entity.title || 'Без названия'
            }

            const exists = account.assignedGroups.some(g => g.id === groupId)
            if (!exists) {
                account.assignedGroups.push(groupInfo)
                this.saveAccounts()
                return true
            }
        } catch (error) {
            console.error('Ошибка при добавлении группы:', error)
            return false
        }

        return false
    }

    async broadcastMessage(
        message: string,
        accountIds: string[],
        voiceData?: { name: string; base64: string },
        videoData?: { name: string; base64: string }
    ): Promise<void> {
        for (const accountId of accountIds) {
            const account = this.accounts.find(a => a.id === accountId)
            if (!account || !account.isActive) continue

            const client = this.clients.get(account.sessionName) || await this.authManager.createClient(account.sessionName)
            if (!client) continue

            for (const group of account.assignedGroups) {
                try {
                    if (voiceData) {
                        const tempPath = path.join(app.getPath('temp'), voiceData.name)
                        const buffer = Buffer.from(voiceData.base64, 'base64')

                        fs.writeFileSync(tempPath, buffer)

                        await client.sendFile(group.id, {
                            file: tempPath,
                            voiceNote: true
                        })

                        fs.unlinkSync(tempPath)
                        console.log(`Голосовое отправлено от @${account.username} в "${group.title}"`)
                    }

                    if (videoData) {
                        const tempPath = path.join(app.getPath('temp'), videoData.name)
                        const buffer = Buffer.from(videoData.base64, 'base64')

                        fs.writeFileSync(tempPath, buffer)

                        await client.sendFile(group.id, {
                            file: tempPath,
                            videoNote: true
                        })

                        // await client.sendMessage(group.id, {
                        //     file: tempPath,
                        //     video_note: true
                        // })

                        fs.unlinkSync(tempPath)
                        console.log(`Кружок отправлен от @${account.username} в "${group.title}"`)
                    }

                    if (message) {
                        await client.sendMessage(group.id, { message })
                        console.log(`Сообщение отправлено от @${account.username} в "${group.title}"`)
                    }
                } catch (error) {
                    console.error(`Ошибка при отправке от @${account.username} в "${group.title}"`, error)
                }
            }

            if (!this.clients.has(account.sessionName)) {
                await client.disconnect()
            }
        }
    }

    async disconnectAllClients() {
        for (const [sessionName, client] of this.clients) {
            try {
                await client.disconnect();
                console.log(`🔌 Отключён клиент: ${sessionName}`);
            } catch (error) {
                console.error(`Ошибка при отключении ${sessionName}:`, error);
            }
        }

        this.clients.clear();
    }
}

interface Account {
    id: string
    sessionName: string
    phoneNumber: string
    username: string
    assignedGroups: Array<{ id: string; title: string }>
    isActive: boolean
}