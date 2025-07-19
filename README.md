# AI Sidebar

A powerful AI sidebar for Chrome that lets you open multiple websites side-by-side, manage a library of custom prompts, and seamlessly interact with content from any webpage.

<p align="center">
  <img src="src/icons/icon128.png" alt="AI Sidebar Icon">
</p>

## Key Features

### Advanced Prompting & Interaction
-   **Contextual Prompts**: Select text on any webpage, and it automatically appears in the sidebar, along with a dynamic menu of your custom prompts to act on that text.
-   **Slash Commands**: Type `/` in the prompt input to bring up a searchable menu of your custom prompts for quick access.
-   **Pinning Prompts**: Select a prompt via the slash command menu to "pin" it. While pinned, all text you type is used as the input for that specific prompt, allowing for specialized, multi-turn conversations.
-   **Selective Interaction**: Hover over any active panel to reveal controls. You can send the main prompt to just that panel or append its latest output back into the prompt area.
-   **Aggregate Outputs**: A dedicated button collects the latest outputs from all active panels, formats them in Markdown, and appends them to the prompt area for further use.
-   **Google Search Toggle**: On supported sites (e.g., Gemini), a button appears to toggle Google Search grounding for that specific panel. A global toggle is also available in the main controls to activate this feature across all compatible panels simultaneously.
-   **Clear AI Studio Chat**: For AI Studio panels, a dedicated button is available to clear the chat history with a single click, streamlining your workflow.

### Comprehensive Management
-   **Full URL Control**: From the settings page, you can add, edit, delete, reorder (via drag-and-drop), and select/deselect the websites you want to use. Bulk actions are also available.
-   **Full Prompt Management**: A dedicated "Prompts" section in the settings allows you to create, edit, and delete custom prompts. You can also drag-and-drop prompts to reorder them or to show/hide them from the UI menus.
-   **Language Customization**: Choose a display language in settings, and the extension will use it to format prompts that include the `${lang}` placeholder.

### Core Functionality
-   **Multi-Website Display**: Open multiple websites simultaneously in the side panel.
-   **Standalone Full-Page Mode**: Open the entire interface in a full browser tab for more space, accessible via a button or the `Ctrl+Shift+Y` (`Cmd+Shift+Y` on Mac) shortcut.
-   **Local Storage**: Remembers your URLs, prompts, and settings securely on your device.
-   **Embed Compatibility**: Automatically modifies HTTP headers to allow most websites (e.g., `gemini.google.com`, `chatgpt.com`) to be embedded in iframes.
-   **Local File Support**: View local documents like PDFs and HTML files by adding their file paths and granting the extension permission to access file URLs.

## How it Works

The extension's architecture is designed for security and functionality:

-   **Core Interface**: The extension utilizes Chrome's **Side Panel API** for its primary view. User settings, URLs, and prompts are stored locally and securely using the `chrome.storage.local` API.
-   **Content Interaction**: A **content script** (`content.js`) runs on all web pages. It has a dual role: on standard pages, it detects user text selections and sends them to the sidebar. Inside the iframes hosted by the sidebar, it listens for messages to inject prompts or extract AI-generated output by interacting with the website's DOM.
-   **Cross-Domain Embedding**: To enable embedding of websites that would normally block it, the **background script** (`background.js`) uses the `declarativeNetRequest` API. This API allows the extension to modify network headers on the fly, specifically removing `x-frame-options`, `content-security-policy`, and `Sec-Fetch-Dest` headers that prevent a page from being loaded in an iframe. This is a secure and performant method that respects user privacy, as it doesn't read the content of network requests.
-   **Communication**: The different parts of the extension (sidebar, content scripts, background script) communicate securely using Chrome's message passing APIs.

## A Note on Website Compatibility

This extension interacts with third-party websites by programmatically manipulating their Document Object Model (DOM). Websites like ChatGPT, Gemini, etc., frequently update their code. These updates can change the specific selectors that the extension uses to find elements like the prompt input area or the send button. When a website integration breaks, it is almost always due to such an update. While we strive to keep the selectors current, some sites may temporarily become incompatible.

## Installation

1.  Download or clone this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked" and select the `src` directory from this project.