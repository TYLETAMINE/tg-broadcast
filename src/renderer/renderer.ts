import "./style.css"
import { Modal } from "./components/Modal"

declare global {
    interface Window {
        electronAPI?: {
            onShowPrompt: (callback: (data: { message: string; id: number }) => void) => () => void
            sendPromptResponse: (data: { id: number; value: string | null }) => void
            onShowAlert: (callback: (message: string) => void) => () => void

            addAccount: () => Promise<Account | null>
            getAccounts: () => Promise<Account[]>
            assignGroup: (accountId: string, groupId: string) => Promise<boolean>
            broadcastMessage: (
                message: string,
                accountIds: string[],
                voiceData?: { name: string; base64: string },
                videoData?: { name: string; base64: string }
            ) => Promise<void>
            checkForUpdates: () => Promise<void>
        };
    }
}

export { }

interface Account {
    id: string
    sessionName: string
    phoneNumber: string
    username?: string
    assignedGroups: Array<{ id: string; title: string }>
    isActive: boolean
}

let cleanupPrompt: (() => void) | undefined
let cleanupAlert: (() => void) | undefined

let selectedVoiceData: { name: string; base64: string } | null = null
let selectedVideoData: { name: string; base64: string } | null = null
let preview: HTMLElement | null = null
let videoPreview: HTMLElement | null = null

document.addEventListener('DOMContentLoaded', async () => {
    const app = document.getElementById('app');
    const api = window.electronAPI

    if (!api) {
        app!.innerText = 'Electron API недоступен';
        return;
    }

    // Настройка диалогов
    cleanupPrompt?.()
    cleanupAlert?.()

    cleanupPrompt = api.onShowPrompt(({ message, id }) => {
        Modal.prompt(message, 'Введите значение...').then(value => {
            api.sendPromptResponse({ id, value });
        })
    })

    cleanupAlert = api.onShowAlert((message) => {
        Modal.alert(message)
    })

    const addButton = document.getElementById('add-account')!;
    addButton.addEventListener('click', async () => {
        try {
            const account = await api.addAccount();
            if (account) {
                await Modal.alert(`Акк добавлен: @${account.username || 'без username'}`)
                await api.getAccounts()
                renderAccounts();
            }
        } catch (error) {
            await Modal.alert(`Ошибка при отправке: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
        }
    });

    const sendButton = document.getElementById('send-button')!;
    sendButton.addEventListener('click', async () => {
        const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
        const message = messageInput.value.trim();

        if (!message && !selectedVoiceData && !selectedVideoData) {
            await Modal.alert('Введи сообщение, выбери гс или кружок')
            return;
        }

        const checkboxes = document.querySelectorAll<HTMLInputElement>('.account-checkbox:checked');
        const accountIds = Array.from(checkboxes).map(cb => cb.value);

        if (accountIds.length === 0) {
            await Modal.alert('Выбери хотя бы один акк')
            return;
        }

        try {
            await api.broadcastMessage(
                message,
                accountIds,
                selectedVoiceData || undefined,
                selectedVideoData || undefined
            )
            await Modal.alert('Сообщения отправлены')
            messageInput.value = '';
            selectedVoiceData = null
            selectedVideoData = null
            updateVoicePreview()
            updateVideoPreview()
        } catch (error) {
            await Modal.alert(`Ошибка при отправке: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
        }
    });

    // Отправка гс
    const selectVoiceBtn = document.getElementById('select-voice-btn')

    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.ogg'
    fileInput.style.display = 'none'
    document.body.appendChild(fileInput)

    preview = document.getElementById('voice-preview')!

    selectVoiceBtn?.addEventListener('click', () => {
        fileInput.click()
    })

    fileInput.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file && file.name.endsWith('.ogg')) {
            const arrayBuffer = await file.arrayBuffer()

            let binary = ''
            const bytes = new Uint8Array(arrayBuffer)

            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i])
            }
            const base64 = btoa(binary)

            selectedVoiceData = {
                name: file.name,
                base64: base64
            }

            updateVoicePreview()
        } else {
            await Modal.alert('Только файлы с .ogg')
        }
    })

    function updateVoicePreview() {
        if (!selectedVoiceData) {
            preview!.classList.remove('active')
            return
        }

        preview!.innerHTML = `
        <div class="filename">${selectedVoiceData.name}</div>
        <svg xmlns="http://www.w3.org/2000/svg" class="remove svg-icon" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 
            .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 
            1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 
            0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" /></svg>`
        preview!.classList.add('active')

        preview!.querySelector('.remove')!.addEventListener('click', () => {
            selectedVoiceData = null
            updateVoicePreview()
        })
    }

    // отправка кружка
    const selectVideoBtn = document.getElementById('select-video-btn')

    const videoInput = document.createElement('input')
    videoInput.type = 'file'
    videoInput.accept = 'video/mp4,video/quicktime'
    videoInput.style.display = 'none'
    document.body.appendChild(videoInput)

    videoPreview = document.getElementById('video-preview')!

    selectVideoBtn?.addEventListener('click', () => {
        videoInput.click()
    })

    videoInput.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file && (file.name.endsWith('.mp4') || file.name.endsWith('.mov'))) {
            const arrayBuffer = await file.arrayBuffer()
            let binary = ''
            const bytes = new Uint8Array(arrayBuffer)

            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i])
            }
            const base64 = btoa(binary)

            selectedVideoData = {
                name: file.name,
                base64: base64
            }

            updateVideoPreview()
        } else {
            await Modal.alert('Только файлы с .mp4 или .mov')
        }
    })

    function updateVideoPreview() {
        if (!selectedVideoData) {
            videoPreview!.classList.remove('active')
            return
        }

        videoPreview!.innerHTML = `
        <div class="filename">${selectedVideoData.name}</div>
        <svg xmlns="http://www.w3.org/2000/svg" class="remove svg-icon" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 
            .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 
            1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 
            0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" /></svg>`
        videoPreview!.classList.add('active')

        videoPreview!.querySelector('.remove')!.addEventListener('click', () => {
            selectedVideoData = null
            updateVideoPreview()
        })
    }

    renderAccounts();

    const menuToggle = document.getElementById('menuToggle')!
    const mainMenu = document.getElementById('mainMenu')!

    menuToggle?.addEventListener('click', (event) => {
        event.stopPropagation()
        mainMenu?.classList.toggle('hidden')
    })

    document.addEventListener('click', (event) => {
        if (
            event.target instanceof Element &&
            !mainMenu.contains(event.target) &&
            !menuToggle.contains(event.target)
        ) {
            mainMenu.classList.add('hidden')
        }
    })

    const themeToggle = document.getElementById('themeToggle')!
    let currentTheme = 'light'

    const savedTheme = localStorage.getItem('theme') || 'light'
    applyTheme(savedTheme)

    themeToggle.addEventListener('click', () => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light'
        applyTheme(newTheme)
        localStorage.setItem('theme', newTheme)
    })

    function applyTheme(theme: string) {
        currentTheme = theme
        document.documentElement.setAttribute('data-theme', theme)
    }

    const checkUpdate = document.getElementById('checkUpdate')!

    checkUpdate.addEventListener('click', async () => {
        try {
            await window.electronAPI?.checkForUpdates()
            console.log('Проверка прошла успешно')
        } catch (error) {
            console.error('Ошибка обновления:', error)
        }
    })
});

let currentPage = 1
const accountsPerPage = 10

async function renderAccounts() {
    const accountsList = document.getElementById('accounts-list')!;
    const accounts = await window.electronAPI?.getAccounts();

    if (!accounts || accounts.length === 0) {
        accountsList.innerHTML = '<p>Нет добавленных аккаунтов.</p>';
        renderPagination(0)
        return
    }

    const totalPages = Math.ceil(accounts.length / accountsPerPage)
    const startIndex = (currentPage - 1) * accountsPerPage
    const currentAccounts = accounts.slice(startIndex, startIndex + accountsPerPage)

    let html = '';

    currentAccounts.forEach(account => {
        const groupsText = account.assignedGroups.length > 0
            ? account.assignedGroups.map(g => g.title).join(', ')
            : 'нет привязанных групп';

        html = `
        <div class="table_row mb-10">
            <div class="checkbox">
                <input type="checkbox" class="account-checkbox" value="${account.id}" checked>
            </div>
            <div class="username">
                <p>@${account.username || 'не задан'}</p>
            </div>
            <p>${groupsText}</p>
            <div class="options">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
                    class="assign-group-btn" data-id="${account.id}">
                    <path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 
                    0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2" />
                </svg>
            </div>
        </div>`
    });

    accountsList.innerHTML = html;
    renderPagination(totalPages)

    document.querySelectorAll('.assign-group-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const accountId = button.getAttribute('data-id')!;
            const groupId = await Modal.prompt('@username или ID группы:', '@username или -100...');

            if (!groupId) return;

            try {
                const success = await window.electronAPI?.assignGroup(accountId, groupId);

                if (success) {
                    await Modal.alert('Группа привязана')
                    await window.electronAPI?.getAccounts()
                    renderAccounts();
                } else {
                    await Modal.alert('Группа не привязана, проверь username/ID и права админа')
                }
            } catch (error) {
                await Modal.alert(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
            }
        });
    });
}

function renderPagination(totalPages: number) {
    const pagination = document.getElementById('pagination')!
    if (totalPages <= 1) {
        pagination.innerHTML = ''
        return
    }

    let buttons = ''

    if (currentPage > 1) {
        buttons += `<button class="page-btn" data-page="${currentPage - 1}">← Назад</button>`
    }

    for (let i = 1; i <= totalPages; i++) {
        const active = i === currentPage ? 'style="background: rgb(58, 0, 255); color: white;"' : ''
        buttons += `<button class="page-btn" data-page="${i}" ${active}>${i}</button>`
    }

    if (currentPage < totalPages) {
        buttons += `<button class="page-btn" data-page="${currentPage + 1}">Вперёд →</button>`
    }

    pagination.innerHTML = `<div style="margin-top: 20px; text-align: center;">${buttons}</div>`;

    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = parseInt((e.target as HTMLElement).getAttribute('data-page')!)
            currentPage = page
            renderAccounts()
        });
    });
}

window.addEventListener('beforeunload', () => {
    cleanupPrompt?.()
    cleanupAlert?.()
})