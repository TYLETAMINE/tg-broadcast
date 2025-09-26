import { Api, TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"
import * as fs from "fs"
import * as path from "path"
import { MessageBox } from "./messageBox"
import { app } from "electron"

const SESSIONS_DIR = path.join(app.getPath('userData'), 'sessions')

if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true })
}

export class AuthManager {
    private apiId: number
    private apiHash: string

    constructor(apiId: number, apiHash: string) {
        this.apiId = apiId
        this.apiHash = apiHash
    }

    async createClient(sessionName: string): Promise<TelegramClient> {
        const sessionPath = path.join(SESSIONS_DIR, `${sessionName}.session`)
        let stringSession = ''

        if (fs.existsSync(sessionPath)) {
            stringSession = fs.readFileSync(sessionPath, 'utf-8')
        }

        const session: StringSession = new StringSession(stringSession)
        const client = new TelegramClient(session, this.apiId, this.apiHash, {
            connectionRetries: 5,
            timeout: 60000,
        })

        await client.start({
            phoneNumber: async () => {
                let phone = await MessageBox.prompt('Номер телефона (через +7):')

                phone = phone?.replace(/\D/g, '') || '';
                if (!phone) {
                    // MessageBox.alert('Номер слишком короткий или пустой');
                    return ''; // или повторить запрос
                }

                return phone
            },

            password: async () => {
                const pass = await MessageBox.prompt('Пароль от дф:')
                return pass || ""
            },

            phoneCode: async () => {
                const code = await MessageBox.prompt('Код из тг:')
                return code || ""
            },

            onError: (err) => {
                console.error('Ошибка авторизации: ', err)
                MessageBox.alert(`Ошибка: ${err.message}`)
            }
        })

        const savedSession = await client.session.save()
        if (typeof savedSession === 'string') {
            try {
                fs.writeFileSync(sessionPath, savedSession, 'utf-8')
                console.log(`Сессия сохранена: ${sessionPath}`)
            } catch (error) {
                console.error('Ошибка записи сессии:', error)
            }
        } else {
            console.error('Ошибка: session.save() не вернул строку')
        }

        return client
    }
}
