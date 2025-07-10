// Manages the slash command and pinned prompt functionality.
let pinnedPrompt = null;
let slashCommandSelectedIndex = -1;

function getPinnedPrompt() {
    return pinnedPrompt;
}

function isSlashCommandPopupVisible() {
    const slashCommandPopup = document.getElementById('slash-command-popup');
    return slashCommandPopup && slashCommandPopup.style.display === 'block';
}

function renderPinnedPrompt() {
    const pinnedPromptContainer = document.getElementById('pinned-prompt-container');
    pinnedPromptContainer.innerHTML = '';
    if (pinnedPrompt) {
        const tag = document.createElement('div');
        tag.className = 'pinned-prompt-tag';
        tag.innerHTML = `
            <div class="pinned-prompt-header">
                <span class="pinned-prompt-name">${pinnedPrompt.name}</span>
                <div class="pinned-prompt-actions">
                    <button class="pinned-prompt-close" title="Unpin prompt">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
            <div class="pinned-prompt-content">${pinnedPrompt.content}</div>
        `;
        tag.querySelector('.pinned-prompt-close').addEventListener('click', unpinPrompt);
        pinnedPromptContainer.appendChild(tag);
        pinnedPromptContainer.style.display = 'flex';
    } else {
        pinnedPromptContainer.style.display = 'none';
    }
}

function unpinPrompt() {
    pinnedPrompt = null;
    renderPinnedPrompt();
}

function pinPrompt(prompt) {
    const promptInput = document.getElementById('prompt-input');
    const currentText = promptInput.value;
    const triggerIndex = currentText.lastIndexOf('/');
    const textBeforeTrigger = currentText.substring(0, triggerIndex).trimEnd();
    promptInput.value = textBeforeTrigger ? textBeforeTrigger + ' ' : '';

    pinnedPrompt = prompt;
    renderPinnedPrompt();
    hideSlashCommandMenu();
    promptInput.focus();
    
    const promptContainer = document.getElementById('prompt-container');
    const sendPromptButton = document.getElementById('send-prompt-button');
    const clearPromptButton = document.getElementById('clear-prompt-button');
    autoResizeTextarea(promptInput, promptContainer, sendPromptButton, clearPromptButton);
}

function updateSlashCommandSelection() {
    const slashCommandList = document.getElementById('slash-command-list');
    const items = slashCommandList.querySelectorAll('.slash-command-item');
    if (!items.length) return;

    if (slashCommandSelectedIndex < 0) slashCommandSelectedIndex = items.length - 1;
    if (slashCommandSelectedIndex >= items.length) slashCommandSelectedIndex = 0;

    items.forEach((item, index) => {
        item.classList.toggle('selected', index === slashCommandSelectedIndex);
        if (index === slashCommandSelectedIndex) {
            item.scrollIntoView({ block: 'nearest' });
        }
    });
}

async function showSlashCommandMenu(query) {
    const slashCommandPopup = document.getElementById('slash-command-popup');
    const slashCommandList = document.getElementById('slash-command-list');
    const { prompts } = await chrome.storage.local.get('prompts');
    const visiblePrompts = (prompts || []).filter(p => 
        p.showInMenu && p.name.toLowerCase().includes(query.toLowerCase())
    );

    slashCommandList.innerHTML = '';
    if (visiblePrompts.length === 0) {
        hideSlashCommandMenu();
        return;
    }

    visiblePrompts.forEach(prompt => {
        const item = document.createElement('button');
        item.className = 'slash-command-item';
        item.textContent = prompt.name;
        item.addEventListener('click', () => pinPrompt(prompt));
        slashCommandList.appendChild(item);
    });

    slashCommandPopup.style.display = 'block';
    slashCommandSelectedIndex = -1;
}

function hideSlashCommandMenu() {
    const slashCommandPopup = document.getElementById('slash-command-popup');
    if (slashCommandPopup) {
        slashCommandPopup.style.display = 'none';
        slashCommandSelectedIndex = -1;
    }
}

function initializeSlashCommands(elements) {
    const { promptInput } = elements;
    const slashCommandPopup = document.getElementById('slash-command-popup');
    const slashCommandList = document.getElementById('slash-command-list');
    const slashCommandSettings = document.getElementById('slash-command-settings');
    const openPromptSettingsInMoreMenu = document.getElementById('open-prompt-settings');

    const openSettings = () => chrome.tabs.create({ url: 'options.html?section=prompts' });
    if (slashCommandSettings) slashCommandSettings.addEventListener('click', openSettings);
    if (openPromptSettingsInMoreMenu) openPromptSettingsInMoreMenu.addEventListener('click', openSettings);

    promptInput.addEventListener('input', () => {
        const text = promptInput.value;
        const triggerIndex = text.lastIndexOf('/');
        if (triggerIndex !== -1 && (triggerIndex === 0 || /\s/.test(text[triggerIndex - 1]))) {
            const potentialQuery = text.substring(triggerIndex + 1);
            if (!/\s/.test(potentialQuery)) {
                showSlashCommandMenu(potentialQuery);
            } else {
                hideSlashCommandMenu();
            }
        } else {
            hideSlashCommandMenu();
        }
    });

    promptInput.addEventListener('keydown', (event) => {
        if (!isSlashCommandPopupVisible()) return;

        if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
            event.preventDefault();
            const items = slashCommandList.querySelectorAll('.slash-command-item');
            if (items.length === 0) return;

            if (event.key === 'ArrowDown') slashCommandSelectedIndex++;
            if (event.key === 'ArrowUp') slashCommandSelectedIndex--;
            if (event.key === 'Enter') {
                if (slashCommandSelectedIndex > -1 && items[slashCommandSelectedIndex]) {
                    items[slashCommandSelectedIndex].click();
                } else {
                    hideSlashCommandMenu();
                }
                return;
            }
            updateSlashCommandSelection();
        }
        if (event.key === 'Escape') {
            hideSlashCommandMenu();
        }
    });
}