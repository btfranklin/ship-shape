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

tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const targetId = button.dataset.tabTarget;
        if (!targetId) return;
        activateTab(targetId);
    });
});

const defaultTab = tabButtons.find((button) => button.classList.contains('active'));
if (defaultTab?.dataset.tabTarget) {
    activateTab(defaultTab.dataset.tabTarget);
}
