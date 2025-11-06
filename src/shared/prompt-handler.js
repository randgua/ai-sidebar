// Manages the contextual prompt UI that appears on text selection.
// Keep a reference to the ResizeObserver to manage its lifecycle.
let promptResizeObserver = null;

/**
 * Resets the contextual UI elements to their default hidden state.
 */
function resetContextualUI() {
    const contextContainer = document.getElementById('context-container');
    const promptButtonsContainer = document.getElementById('prompt-buttons-container');
    const morePromptsPopup = document.getElementById('more-prompts-popup');
    const promptInputDivider = document.querySelector('.prompt-input-divider');

    if(contextContainer) {
        contextContainer.style.display = 'none';
        contextContainer.querySelector('#context-content').textContent = '';
        delete contextContainer.dataset.text;
    }
    
    if(promptButtonsContainer) {
        promptButtonsContainer.style.display = 'none';
        promptButtonsContainer.innerHTML = '';
    }

    if(morePromptsPopup) {
        morePromptsPopup.style.display = 'none';
    }
    
    if (promptInputDivider) {
        promptInputDivider.style.display = 'none';
    }
}

/**
 * Creates a single prompt button element.
 * @param {object} prompt The prompt data.
 * @param {string} selectedText The text to be used in the prompt.
 * @param {boolean} isMoreMenuItem True if the button is for the popup menu.
 * @returns {HTMLButtonElement} The created button element.
 */
function createPromptButton(prompt, selectedText, isMoreMenuItem = false) {
    const button = document.createElement('button');
    button.textContent = prompt.name;
    button.className = isMoreMenuItem ? 'more-prompt-item' : 'prompt-button';
    button.addEventListener('click', async () => {
        let fullPrompt;
        const { displayLanguage } = await chrome.storage.local.get('displayLanguage');
        const lang = displayLanguage || 'English';

        let promptContent = prompt.content.replace(/\${lang}/g, lang);
        if (promptContent.includes('${input}')) {
            fullPrompt = promptContent.replace('${input}', selectedText);
        } else {
            fullPrompt = `${promptContent}\n\n"""\n${selectedText}\n"""`;
        }
        
        sendMessageToIframes(fullPrompt);
        resetContextualUI();
    });
    return button;
}

/**
 * Renders prompt buttons and sets up responsive resizing using a robust
 * "pre-render -> measure -> precise render" strategy to avoid race conditions.
 * @param {string} selectedText The text that the prompts will act upon.
 * @param {Array} visiblePrompts The list of prompt objects to render.
 */
function renderResponsivePrompts(selectedText, visiblePrompts) {
    const promptButtonsContainer = document.getElementById('prompt-buttons-container');
    const morePromptsPopup = document.getElementById('more-prompts-popup');
    if (!promptButtonsContainer || !morePromptsPopup) return;
    
    if (promptResizeObserver) {
        promptResizeObserver.disconnect();
    }
    
    // --- Cleanup Phase ---
    promptButtonsContainer.innerHTML = '';
    const morePromptsList = morePromptsPopup.querySelector('#more-prompts-list');
    morePromptsList.innerHTML = '';
    morePromptsPopup.style.display = 'none';
    if (morePromptsPopup.parentElement) {
        morePromptsPopup.parentElement.removeChild(morePromptsPopup);
    }
    if (!visiblePrompts || visiblePrompts.length === 0) return;

    // --- 1. Pre-render Phase ---
    // Create a wrapper and immediately render ALL buttons into it.
    // By allowing wrapping, we force the container to expand and acquire a measurable width,
    // breaking the "chicken-and-egg" paradox of needing content to get a width.
    const mainButtonsWrapper = document.createElement('div');
    mainButtonsWrapper.className = 'main-prompt-buttons';
    mainButtonsWrapper.style.flexWrap = 'wrap'; // Temporarily allow wrapping
    const allButtons = visiblePrompts.map(prompt => createPromptButton(prompt, selectedText, false));
    allButtons.forEach(button => mainButtonsWrapper.appendChild(button));
    promptButtonsContainer.appendChild(mainButtonsWrapper);

    // This function will measure the pre-rendered layout and adjust it precisely.
    const adjustLayout = () => {
        const buttonsInContainer = Array.from(mainButtonsWrapper.children);
        if (buttonsInContainer.length === 0) {
            mainButtonsWrapper.style.flexWrap = 'nowrap'; // Reset style and exit
            return;
        }

        // --- 2. Measure Phase ---
        // Find the first button that has wrapped to a new line by checking its vertical position.
        const firstButtonTop = buttonsInContainer[0].offsetTop;
        let splitIndex = -1;
        for (let i = 1; i < buttonsInContainer.length; i++) {
            if (buttonsInContainer[i].offsetTop > firstButtonTop) {
                splitIndex = i;
                break;
            }
        }

        // --- 3. Precise Render Phase ---
        // If a split point was found, move the overflowed buttons to the "more" menu.
        if (splitIndex !== -1) {
            const morePromptsWrapper = document.createElement('div');
            morePromptsWrapper.className = 'more-prompts-wrapper';
            const moreButton = document.createElement('button');
            moreButton.className = 'prompt-button more-button';
            moreButton.innerHTML = '<span class="material-symbols-outlined">more_horiz</span>';
            
            morePromptsWrapper.appendChild(moreButton);
            morePromptsWrapper.appendChild(morePromptsPopup);
            promptButtonsContainer.appendChild(morePromptsWrapper);

            const promptsToHide = visiblePrompts.slice(splitIndex);
            promptsToHide.forEach(promptData => {
                morePromptsList.appendChild(createPromptButton(promptData, selectedText, true));
            });

            // Remove the now-hidden buttons from the main view.
            while (mainButtonsWrapper.children.length > splitIndex) {
                mainButtonsWrapper.removeChild(mainButtonsWrapper.lastChild);
            }

            // Add hover logic for the newly created "more" menu.
            let hidePopupTimeout;
            const showPopup = () => { clearTimeout(hidePopupTimeout); morePromptsPopup.style.display = 'block'; };
            const hidePopup = () => { hidePopupTimeout = setTimeout(() => { morePromptsPopup.style.display = 'none'; }, 200); };
            morePromptsWrapper.addEventListener('mouseenter', showPopup);
            morePromptsWrapper.addEventListener('mouseleave', hidePopup);
        }
        
        // Restore the non-wrapping style for a clean single-line visual presentation.
        mainButtonsWrapper.style.flexWrap = 'nowrap';
    };

    // Schedule the measurement and adjustment to run after the browser has painted the pre-rendered layout.
    window.requestAnimationFrame(adjustLayout);

    // The observer's role is now to re-run this entire robust process if the user resizes the panel.
    promptResizeObserver = new ResizeObserver(() => {
        // A small debounce to prevent excessive re-renders during rapid resizing.
        let debounceTimeout;
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            renderResponsivePrompts(selectedText, visiblePrompts);
        }, 50);
    });
    promptResizeObserver.observe(promptButtonsContainer);
}


/**
 * Displays the contextual UI with the selected text and prompt buttons.
 * @param {string} selectedText The text selected by the user on the webpage.
 */
async function displayContextualUI(selectedText) {
    const contextContainer = document.getElementById('context-container');
    const contextContent = contextContainer.querySelector('#context-content');
    const promptButtonsContainer = document.getElementById('prompt-buttons-container');
    const promptInputDivider = document.querySelector('.prompt-input-divider');
    
    contextContent.textContent = selectedText;
    contextContainer.style.display = 'flex';
    contextContainer.dataset.text = selectedText;

    promptButtonsContainer.style.display = 'flex';
    
    if (promptInputDivider) {
        promptInputDivider.style.display = 'block';
    }

    let result = await chrome.storage.local.get('prompts');
    let prompts = result.prompts || [];
    const visiblePrompts = prompts.filter(p => p.showInMenu);

    renderResponsivePrompts(selectedText, visiblePrompts);
}