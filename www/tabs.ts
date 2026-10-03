const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-tab-target]'));
const tabPanels = Array.from(document.querySelectorAll<HTMLElement>('.tab-panel'));

function activateTab(targetId: string) {
    tabButtons.forEach((button) => {
        const isActive = button.dataset.tabTarget === targetId;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        button.tabIndex = isActive ? 0 : -1;
    });

    tabPanels.forEach((panel) => {
        const isActive = panel.id === targetId;
        panel.classList.toggle('active', isActive);
        panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    document.dispatchEvent(new CustomEvent('tabchange', { detail: { targetId } }));
}

tabButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
        const targetId = button.dataset.tabTarget;
        if (!targetId) return;
        activateTab(targetId);
    });

    button.addEventListener('keydown', (event: KeyboardEvent) => {
        let nextIndex: number;
        switch (event.key) {
            case 'ArrowRight':
                nextIndex = (index + 1) % tabButtons.length;
                break;
            case 'ArrowLeft':
                nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
                break;
            case 'Home':
                nextIndex = 0;
                break;
            case 'End':
                nextIndex = tabButtons.length - 1;
                break;
            default:
                return;
        }

        event.preventDefault();
        const nextButton = tabButtons[nextIndex];
        const targetId = nextButton?.dataset.tabTarget;
        if (!nextButton || !targetId) return;
        activateTab(targetId);
        nextButton.focus();
    });
});

const defaultTab = tabButtons.find((button) => button.classList.contains('active'));
if (defaultTab?.dataset.tabTarget) {
    activateTab(defaultTab.dataset.tabTarget);
}
