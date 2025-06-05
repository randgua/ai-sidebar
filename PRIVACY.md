Privacy Policy for AI Sidebar Chrome Extension

Last Updated: June 3, 2025

Thank you for using AI Sidebar (the "Extension"). This Privacy Policy explains how we handle information in relation to the Extension.

**1. Information We Collect**

The AI Sidebar Extension allows users to configure and store the following information:
*   **Custom URL Lists:** Users can input and store lists of custom website URLs.
*   **Selected URLs:** From these lists, users can select which URLs are to be loaded in the side panel.
*   **URL Order:** The order of URLs within these lists, as arranged by the user (e.g., via drag-and-drop in settings), is stored.

These custom URL lists, their selection state, and their order are actively provided or configured by the user and are stored locally within the user's own browser through the `chrome.storage.local` API.

We DO NOT collect any other personally identifiable information (PII) apart from the URL lists (including their order and selection state) that the user voluntarily configures for the Extension's intended functionality. We do not collect names, email addresses, general browsing history (other than the specific URLs you explicitly manage within the Extension), or any other personal data.

**2. How We Use Your Information**

The stored URL lists, their selection state, and URL order are used solely to enable the core functionality of the Extension. This means this information is used to:
*   Load the selected websites into the browser's side panel using the custom URLs you have selected from your lists.
*   Remember and apply your list of URLs and their selection state when you open the side panel.
*   Display the lists of custom URLs within the Extension's settings popup, allowing the user to manage them (add, edit, delete, reorder, select/deselect).

**3. Information Storage and Security**

The custom URL lists, their selection state, and their order you provide are stored locally on your computer within your Chrome browser's storage area, managed by the `chrome.storage.local` API. This data is NOT synchronized across your signed-in Chrome browsers by this extension (unless you have enabled OS-level or browser-level profile syncing that might include local extension data) and it is NOT transmitted to any external servers controlled by the developer of this Extension, nor is it accessed by or shared with the developer of this Extension or any third parties. The security of this locally stored data is handled by your Chrome browser's security measures.

**4. Data Sharing**

We do not sell, trade, or otherwise transfer the URL lists, their selection state, their order, or any other data you store in the Extension, to outside parties. The data remains local to your browser.

**5. User Control and Access**

You have full control over the information stored by the Extension.
*   **Custom URL Lists:** Through the Extension's settings popup in the side panel, you can at any time:
    *   Add new custom URLs to the list.
    *   Select or deselect URLs from the list for use in the side panel by toggling their checkboxes.
    *   Edit the value of any URL in the list.
    *   Reorder URLs within the list using drag-and-drop.
    *   Delete URLs from the list.
    *   If the URL list in storage is found to be empty when the extension initializes (e.g., on first run, or if all URLs were deleted and the panel reloaded), the extension will repopulate the list with a set of default URLs. If an active URL is deleted, the display updates accordingly.
*   **Selection State:** You can change which URLs are selected at any time using the checkboxes in the settings popup or the bulk selection buttons.

**6. Children's Privacy**

The Extension is not directed at children under the age of 13 (or the relevant age in your jurisdiction), and we do not knowingly collect any personal information from children. If you believe a child has provided us with information, please contact us, and we will take steps to delete such information.

**7. Changes to This Privacy Policy**

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page or through the Chrome Web Store listing. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.

**8. Contact Us**

If you have any questions about this Privacy Policy, please contact us at:
https://github.com/randgua/ai-sidebar