export class Modal {
    private static container: HTMLElement | null = null

    static init() {
        if (this.container) return

        this.container = document.createElement('div')
        this.container.id = 'modal-container'
        this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99;
        pointer-events: none;`

        document.body.appendChild(this.container)
    }

    static async prompt(title: string, placeholder: string = ''): Promise<string | null> {
        this.init()

        return new Promise((resolve) => {
            const modal = document.createElement('div')
            modal.style.cssText = `
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0px 0px 10px 2px rgba(79, 90, 99, 0.15);
            width: 90%;
            max-width: 400px;
            pointer-events: auto;`

            modal.innerHTML = `
            <h3 style="margin: 0 0 16px 0; font-weight: 600;">${title}</h3>
            <input type="text" id="modal-input" placeholder="${placeholder}" style="
            width: 100%;
            padding: 10px;
            margin-bottom: 16px;
            font-size: 16px;
            border-radius: 15px;
            border: 1px solid rgb(210, 210, 210);">

            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button id="modal-cancel" style="
                cursor: pointer;
                padding: 9px 15px;
                border: none;
                border-radius: 99px;
                background: rgb(186, 34, 34);">Отмена</button>

                <button id="modal-ok" style="
                cursor: pointer;
                padding: 9px 15px;
                border: none;
                border-radius: 99px;
                background: rgb(58, 0, 255);
                ">OK</button>
            </div>`

            const input = modal.querySelector('#modal-input') as HTMLInputElement
            const okBtn = modal.querySelector('#modal-ok') as HTMLButtonElement
            const cancelBtn = modal.querySelector('#modal-cancel') as HTMLButtonElement

            const close = () => {
                if (this.container?.contains(modal)) {
                    this.container.removeChild(modal)

                    document.body.removeChild(this.container)
                    this.container = null
                }
            }

            okBtn.onclick = () => {
                resolve(input.value || null)
                close()
            }

            cancelBtn.onclick = () => {
                resolve('')
                close()
            }

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    okBtn.click()
                } else if (e.key === 'Escape') {
                    cancelBtn.click()
                }
            })

            this.container?.appendChild(modal)
            input.focus()
        })
    }

    static async alert(message: string, title: string = 'Уведомление'): Promise<void> {
        this.init()

        return new Promise((resolve) => {
            const modal = document.createElement('div')
            modal.style.cssText = `
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0px 0px 10px 2px rgba(79, 90, 99, 0.15);
            width: 90%;
            max-width: 400px;
            pointer-events: auto`

            modal.innerHTML = `
            <h3 style="margin: 0 0 16px 0; font-weight: 600;">${title}</h3>
            <p style="margin: 0 0 25px 0;">${message}</p>
            <div style="display: flex; justify-content: flex-end;">
            <button id="modal-close" style="
            cursor: pointer;
            padding: 9px 15px;
            color: white;
            border: none;
            border-radius: 99px;
            background: rgb(58, 0, 255);
            ">OK</button>`

            const closeBtn = modal.querySelector('#modal-close') as HTMLButtonElement

            const close = () => {
                if (this.container?.contains(modal)) {
                    this.container.removeChild(modal)

                    document.body.removeChild(this.container)
                    this.container = null
                }

                resolve()
            }

            closeBtn.onclick = () => close()

            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    close()
                }
            })

            this.container?.appendChild(modal)
            closeBtn.focus()
        })
    }
}