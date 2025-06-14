# AI Sidebar

A Chrome extension to open one or more user-configured websites side-by-side in the browser's side panel.

<p align="center">
  <img src="src/icons/icon128.png" alt="AI Sidebar Icon">
</p>

## Features

-   **Multi-Website Display**: Open multiple websites simultaneously in the side panel, arranged horizontally.
-   **Advanced URL Management**: Control your website list via the settings popup (hover over the gear icon):
    -   **Add & Edit**: Add new web URLs or local file paths. Edit any existing URL directly in the list.
    -   **Select & Display**: Check or uncheck URLs to instantly show or hide them in the side panel.
    -   **Drag-and-Drop Reordering**: Seamlessly reorder URLs. During the drag operation, active panels become semi-transparent and unresponsive to ensure a smooth experience and prevent accidental clicks.
    -   **Bulk Actions**: Quickly invert, select all, or clear all selections.
    -   **Delete & Open**: Remove URLs from the list or open any URL in a new tab.
-   **Optimized Refresh**: A floating refresh button reloads all active websites in the side panel without affecting the main browser window.
-   **Embed Compatibility**: Automatically modifies HTTP response headers to allow most websites (e.g., `gemini.google.com`, `chatgpt.com`) to be embedded in iframes.
-   **Persistent Memory**: Remembers your complete list of URLs, their selection state, and their custom order.
-   **Intelligent Selection Handling**: If the only selected URL is deleted, the extension automatically selects the first URL in the list to prevent an empty panel.
-   **Default URL Set**: Comes pre-loaded with a list of popular AI websites on first installation. If you delete all URLs, this default list will be restored on the next load.
-   **Local File Support**: View local documents like PDFs and HTML files by adding their file paths (e.g., `file:///...`). This requires granting the extension permission to access file URLs.

## Installation

1.  Download or clone this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked" and select the `src` directory from this project.

## Usage

-   **Open the Sidebar:** Click the extension icon in the Chrome toolbar.
-   **Manage URLs & Settings:**
    -   Inside the side panel, **hover your mouse over the settings area** in the top-right corner (marked with a gear icon) to reveal the settings popup.
    -   On the settings popup, you can manage your URL list:
        -   **Add new URLs** by typing in the input field and clicking "Add URL". The extension supports web URLs (e.g., `https://example.com`) and local file paths.
        -   **Select/Deselect URLs** for display by checking/unchecking the checkbox next to each URL. Selected URLs will appear in the side panel.
        -   **Edit URLs** directly in the list by clicking on the URL text. Press Enter or click away to save.
        -   **Reorder URLs** within their list using drag-and-drop (click and drag the '≡' handle). The order in the list determines the order of iframes if multiple are selected.
        -   **Delete URLs** from the list using the "Delete" button.
        -   **Open a URL** from the list in a new tab using the "Open" button.
        -   Use **Invert Selection**, **Select All**, or **Clear All Selections** buttons for bulk management.
-   **Refresh Content:** Click the **refresh icon** (circular arrow) in the side panel to reload all currently active iframes.

### Advanced Usage: Viewing Local Files

To view local files (e.g., PDFs, HTML files) in the side panel, you must first grant the extension permission to access file URLs.

1.  In Chrome, navigate to `chrome://extensions`.
2.  Find the **AI Sidebar** extension and click on **Details**.
3.  On the details page, find and enable the **"Allow access to file URLs"** toggle switch.

Once enabled, you can add local file paths to the URL list, for example:
-   **Windows:** `C:\Users\YourUser\Documents\MyFile.pdf`
-   **macOS/Linux:** `/Users/YourUser/Downloads/MyDocument.html`

## How it Works

The extension utilizes Chrome's Side Panel API to display web content. It employs an optimized rendering strategy for iframes, caching them to minimize reloads and DOM updates for smoother performance when changing selections or reordering the list. The settings popup dynamically renders and manages the URL list.

It uses the `declarativeNetRequest` API to dynamically modify HTTP response headers. This action removes `x-frame-options` and `content-security-policy` headers from websites, allowing them to be embedded within an iframe in the side panel.

User preferences, including the list of custom URLs, their selection state, and their order, are stored using `chrome.storage.local`. On first installation, or if the list becomes empty, the extension populates storage with a set of default AI service URLs.