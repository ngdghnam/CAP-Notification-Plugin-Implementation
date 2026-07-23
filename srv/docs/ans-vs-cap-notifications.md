# SAP Alert Notification Service (ANS) vs. CAP Notifications

## 1. What is SAP Alert Notification Service (ANS)?

Alert Notification service is part of the DevOps portfolio of the SAP Business Technology Platform (BTP). The service is specialized in the instant delivery of events coming straight from the core platform services, e.g. database or application monitoring tools. This way you're always the first one notified whenever an issue with your dependency occurs.

Additionally, Alert Notification service provides means for posting real-time crucial events directly from your application. All those events altogether - either your custom events, or the platform ones, could be received on whatever channel is preferred - e-mail, Slack, custom webhook, MS Teams, etc. Furthermore, events can be even stored in Alert Notification service storage and pulled from it later.

### ANS Architecture Overview
ANS operates on a decoupled **Publish/Subscribe** pattern utilizing three core concepts:
- **Events**: The actual payload sent from your backend (e.g., `InquiryOrdered`). Your code only emits this event; it does not dictate who receives it.
- **Conditions**: Rules configured on BTP that filter incoming events (e.g., match `eventType == InquiryOrdered`).
- **Actions**: The actual delivery mechanism configured on BTP (e.g., Send Email, Post to Webhook). HTML Email templates are defined here, not in your application code.
- **Subscriptions**: The glue that binds a Condition to an Action.

---

## 2. Using the `@sap_oss/alert-notification-client` SDK

The `@sap_oss/alert-notification-client` is the official Node.js SDK provided by SAP to interact with the ANS APIs.

### Implementation Guidelines
1. **Dynamic Credentials Parsing**: Unlike built-in CAP services that are automatically bound and normalized, this client requires explicit configuration. You must parse the `VCAP_SERVICES` environment variable directly to extract the raw `client_id`, `client_secret`, and `oauth_url` to avoid CAP framework mangling.
2. **Authentication**: Use the `OAuthAuthentication` class provided by the SDK to automatically handle XSUAA token fetching.
3. **Client Initialization**: Combine the authentication instance and the target region (e.g., `RegionUtils.EU10`) to instantiate the `AlertNotificationClient`.
4. **Emitting Events**: Use the `.sendEvent()` method. You will pass a payload containing standard fields (`subject`, `body`, `severity`, `category`) along with custom `tags`. 
   > **Note:** Tags are used to pass dynamic data (like `customerName` or `carName`) so they can be injected into the BTP-configured Email templates via `{tags.customerName}` placeholders. Do not pass recipient email addresses in the tags, as ANS does not use them for dynamic routing out-of-the-box.

---

## 3. Difference Between ANS and `@cap-js/notifications`

In the SAP CAP ecosystem, there are two primary notification mechanisms, each serving a fundamentally different purpose.

| Feature | `@cap-js/notifications` (SAP Fiori Notifications) | `@sap_oss/alert-notification-client` (SAP BTP ANS) |
| :--- | :--- | :--- |
| **Primary Purpose** | Delivers user-centric notifications to the **bell icon** (Notification Center) within SAP Fiori Launchpad or SAP Build Work Zone. | Delivers system-centric or cross-system alerts to external channels (Email, Slack, MS Teams, ServiceNow, etc.). |
| **User Interface** | Deeply integrated into the Fiori Launchpad UI. Clicking a notification usually navigates the user to a specific app. | Headless. Depends entirely on the receiving channel (e.g., the user's email client or chat application). |
| **Email Capabilities** | Supports sending Emails with local HTML templates (e.g., `./templates/email.html`) directly from the codebase via a configured Destination (`sap.app.mail`). | Requires HTML templates to be configured directly in the BTP Cockpit (Action). The codebase only sends the raw data payload (`tags`). |
| **Routing Mechanism** | Backend code explicitly defines the recipients (`recipients = ['user@example.com']`). CAP handles the delivery directly. | Backend code emits a single event. ANS evaluates pre-configured BTP rules to determine the appropriate channels and recipients. |
| **Implementation** | Model-driven. Relies heavily on CDS annotations (`@notification: {...}`). The CAP framework abstracts the underlying connections. | Code-driven. Requires pure Node.js implementation, manual parsing of `VCAP_SERVICES`, and explicit HTTP client configuration. |
| **Best Used For** | Business workflows, approval processes, and scenarios where users work predominantly inside Fiori. | DevOps monitoring, system error alerting, automated external customer emails, and cross-platform integrations (Slack/Teams). |

### Summary Recommendation
- If the requirement is: *"Notify the user inside the Fiori Launchpad when a new form is assigned to them,"* ➡️ Use **`@cap-js/notifications`**.
- If the requirement is: *"Send a beautifully formatted confirmation email to a customer and notify the IT team via Slack when a system fails,"* ➡️ Use **`@sap_oss/alert-notification-client` (ANS)**.
