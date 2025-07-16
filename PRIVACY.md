Privacy Policy for AI Sidebar Chrome Extension

Last Updated: July 10, 2024

Thank you for using AI Sidebar (the "Extension"). This Privacy Policy explains how we handle information in relation to the Extension. Your privacy is critically important to us.

**1. Data We Store**

The AI Sidebar Extension allows you to configure and store the following information:
*   **Custom URL Lists:** The list of website URLs you add, including their selection state and custom order.
*   **Custom Prompts:** The list of custom prompts you create, including their name, content, visibility in menus, and custom order.
*   **Display Language:** The preferred language you select for prompt templates.

This data is actively provided and configured by you. It is stored **exclusively on your local device** using the `chrome.storage.local` API.

**2. Data We DO NOT Collect or Store**

To be perfectly clear, we DO NOT collect, store, or transmit any of the following:
*   Your browsing history.
*   The content of any web pages you visit.
*   Any text you select on a page (it is used in real-time but never stored).
*   Any prompts you enter or the responses you receive from AI services.
*   Any other personally identifiable information (PII), such as your name, email address, or IP address.

**3. Information Storage and Security**

All data you provide is stored locally on your device using the `chrome.storage.local` API. This means your data is saved only on the computer where you configured it and is **not automatically synchronized across other computers**, even if you are logged into the same Chrome account.

The data is **NEVER** transmitted to any external servers controlled by the developer of this Extension, nor is it accessed by or shared with the developer or any third parties.

**4. Permissions (`host_permissions`)**

The extension requests broad host permissions (`<all_urls>`) in the manifest. This permission is required for two key functions and is **not** used for tracking:
1.  **Text Selection**: To detect when you select text on any webpage so it can be sent to the sidebar.
2.  **Website Interaction**: To programmatically interact with the AI chat websites loaded within the sidebar's iframes (e.g., to input a prompt and click the "send" button).

**We do not monitor, collect, or transmit your browsing activity.** The permission is used strictly to enable the extension's core on-page features.

**5. User Control and Access**

You have full and complete control over the information stored by the Extension. Through the settings pages, you can add, edit, and delete any of your stored data at any time. If you delete an item, it is permanently removed from your local storage.

**6. Changes to This Privacy Policy**

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page or through the Chrome Web Store listing.

**7. Contact Us**

If you have any questions about this Privacy Policy, please contact us via the project's GitHub page:
https://github.com/randgua/ai-sidebar