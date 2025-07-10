// Contains generic helper functions for the UI.

let confirmationMessageElement = null;
let isModalActive = false;

/**
 * Displays a short-lived confirmation message at the bottom of the screen.
 * @param {string} message The message to display.
 * @param {number} duration How long to display the message in milliseconds.
 */
function showGlobalConfirmationMessage(message, duration = 3000) {
    if (!confirmationMessageElement) {
        confirmationMessageElement = document.createElement('div');
        Object.assign(confirmationMessageElement.style, {
            position: 'fixed', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
            padding: '10px 20px', backgroundColor: 'rgba(0, 0, 0, 0.75)', color: 'white',
            borderRadius: '5px', zIndex: '2000', opacity: '0',
            transition: 'opacity 0.3s ease-in-out'
        });
        document.body.appendChild(confirmationMessageElement);
    }

    if (confirmationMessageElement.timeoutId) clearTimeout(confirmationMessageElement.timeoutId);

    confirmationMessageElement.textContent = message;
    confirmationMessageElement.style.opacity = '1';

    confirmationMessageElement.timeoutId = setTimeout(() => {
        confirmationMessageElement.style.opacity = '0';
    }, duration);
}

/**
 * Automatically resizes the prompt textarea and manages its scrollbar visibility.
 * @param {HTMLTextAreaElement} textarea The textarea element.
 * @param {HTMLElement} promptContainer The container for the prompt area.
 * @param {HTMLButtonElement} sendPromptButton The send button.
 * @param {HTMLButtonElement} clearPromptButton The clear button.
 */
function autoResizeTextarea(textarea, promptContainer, sendPromptButton, clearPromptButton) {
    if (!textarea || !promptContainer) return;

    if (promptContainer.classList.contains('collapsed')) {
        textarea.style.height = '';
        return;
    }

    const selection = textarea.selectionStart;
    const maxHeight = Math.floor(window.innerHeight / 3);
    textarea.style.maxHeight = `${maxHeight}px`;

    // Reset height to auto to get the correct scrollHeight for the current content.
    textarea.style.height = 'auto';
    
    const scrollHeight = textarea.scrollHeight;

    // If content is taller than max-height, fix height to max-height and show scrollbar.
    if (scrollHeight > maxHeight) {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = 'auto';
    } else {
        // Otherwise, fit height to content and hide scrollbar.
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
    }

    // Defer cursor and scroll position updates to after the resize has been rendered.
    setTimeout(() => {
        textarea.setSelectionRange(selection, selection);
        textarea.scrollTop = textarea.scrollHeight;
    }, 0);

    const hasText = textarea.value.trim() !== '';
    if (sendPromptButton) sendPromptButton.disabled = !hasText;
    
    if (clearPromptButton) {
        clearPromptButton.style.display = hasText ? 'flex' : 'none';
        const promptInputWrapper = textarea.closest('.prompt-input-wrapper');

        if (hasText && promptInputWrapper) {
            const styles = getComputedStyle(textarea);
            const singleLineHeight = parseFloat(styles.lineHeight);
            const paddingTop = parseFloat(styles.paddingTop);
            const paddingBottom = parseFloat(styles.paddingBottom);
            const textContentHeight = textarea.scrollHeight - paddingTop - paddingBottom;
            // Use a more robust threshold to determine if the content is multi-line.
            const isMultiLine = textContentHeight > (singleLineHeight * 1.5);
            
            // Position the clear button absolutely only when it's multi-line.
            clearPromptButton.classList.toggle('top-right', isMultiLine);
        } else if (promptInputWrapper) {
            // Ensure class is removed when there is no text.
            clearPromptButton.classList.remove('top-right');
        }
    }
}

/**
 * A utility to delay function execution.
 * @param {Function} func The function to debounce.
 * @param {number} wait The debounce duration in milliseconds.
 * @returns {Function} The debounced function.
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}