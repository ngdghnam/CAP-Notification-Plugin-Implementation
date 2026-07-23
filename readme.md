# CAP Upgrade Plugins (Alert Notification)

Welcome to the CAP Upgrade Plugins project. This project extends standard SAP Cloud Application Programming (CAP) Model capabilities by integrating with **SAP Alert Notification Service (ANS)**.

## Project Structure

| File or Folder | Purpose |
| --------- | ---------- |
| `app/` | UI frontend content |
| `db/` | Domain models and database schema |
| `srv/` | Service models and business logic (including ANS integration) |
| `.env` | Environment configuration (requires manual setup) |

## Features
- **Alert Notification Service Integration**: Send typed (`InquiryOrdered`) and simple notifications to recipients via SAP ANS.
- **Environment Driven**: Fully configurable via `.env` to prevent hardcoding sensitive credentials.

## About SAP Alert Notification Service (ANS)
[SAP Alert Notification Service (ANS)](https://help.sap.com/docs/alert-notification) is a service on SAP Business Technology Platform (BTP) that offers a common API to publish and subscribe to alerts. It acts as a central hub to route real-time event notifications from your BTP applications to various delivery channels, including:
- Emails
- Corporate chat tools (Microsoft Teams, Slack)
- SAP Fiori Launchpad notifications
- Custom Webhooks and automation services

By integrating ANS, this plugin offloads the complexity of managing notification channels, templates, and delivery logic from the core CAP application to a dedicated, enterprise-grade BTP service.

## Example Use Case: Car Shop Inquiry System
Imagine you are building a Car Shop portal where customers can submit inquiries about vehicles they want to purchase.

1. **User Action**: A customer submits an inquiry form on the UI (e.g., "I'm interested in the Toyota Camry").
2. **Backend Processing**: The CAP service receives the OData request and saves the `Inquiry` record to the HANA/SQLite database.
3. **Plugin Trigger**: The `CarShopService` in this project intercepts the business event and formats a notification payload.
4. **ANS Delivery**: The service calls the ANS API (via `sendAnsInquiryNotification`) with an `InquiryOrdered` event.
5. **Notification Received**: ANS evaluates its internal routing conditions and dispatches the alert—for instance, sending an urgent email to the sales team (`email`) containing the customer's name, the car of interest, and the inquiry message.

### Other Real-world Use Cases

1. **Workflow & Approval Routing (Purchase Orders / Leave Requests)**
   - **Scenario**: An employee submits a Purchase Order that exceeds the automatic approval limit.
   - **ANS Role**: The CAP backend intercepts the record creation, sets the status to `PENDING_APPROVAL`, and sends an event to ANS. ANS routes an interactive notification directly to the manager's Microsoft Teams or SAP Fiori Launchpad so they can review and approve it immediately.

2. **System Health & Exception Monitoring (DevOps / Integration)**
   - **Scenario**: A scheduled CAP background job that syncs data with SAP S/4HANA fails due to an API timeout.
   - **ANS Role**: The global error handler in the CAP service captures the exception and triggers a `FATAL` severity event via ANS. ANS routes this alert to a DevOps Slack channel and triggers a webhook to create an incident ticket in Jira or ServiceNow.

3. **Threshold & Inventory Alerts (Warehouse Management)**
   - **Scenario**: A CAP inventory application tracks material stock. A specific material drops below the critical minimum threshold.
   - **ANS Role**: The CAP service detects the threshold breach during an update and fires a `WARNING` event. ANS evaluates the rules and sends an urgent Email or SMS (via third-party webhook) to the warehouse supervisor to initiate restocking.
## Setup & Configuration

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory (this file is git-ignored) and configure your ANS settings:
   ```env
   # Alert Notification Service configurations
   ANS_OAUTH_PATH="/oauth/token?grant_type=client_credentials"
   ANS_DEFAULT_RECIPIENTS="your.email@example.com,another.email@example.com"
   ANS_SERVICE_NAME="alert-notification" # or your specific ANS instance name
   ```

3. Ensure your `VCAP_SERVICES` or CAP bindings have the correct Alert Notification service credentials.

## Next Steps

- Run locally using hybrid testing:
  ```bash
  npm run start:hybrid:backend
  ```
- Or use the standard CAP watch command:
  ```bash
  cds watch
  ```

## Learn More
Learn more about SAP CAP at <https://cap.cloud.sap>.
Learn more about SAP Alert Notification Service for SAP BTP at [SAP Help Portal](https://help.sap.com/docs/alert-notification).
