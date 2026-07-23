import cds from "@sap/cds"
import { AlertNotificationClient, OAuthAuthentication, Severity, Category, RegionUtils } from "@sap_oss/alert-notification-client"

export class CarShopService {
    private alertService: any
    private ansClient: AlertNotificationClient | undefined

    async getNotificationService() {
        if (!this.alertService) {
            this.alertService = await cds.connect.to("notifications")
        }
        return this.alertService
    }

    getANSClient() {
        if (!this.ansClient) {
            let creds: any = null;

            // 1. Lấy trực tiếp từ biến môi trường VCAP_SERVICES (để tránh bị CAP framework đổi tên field)
            if (process.env.VCAP_SERVICES) {
                try {
                    const vcap = JSON.parse(process.env.VCAP_SERVICES);
                    const alertServices = vcap["alert-notification"] || [];
                    if (alertServices.length > 0) {
                        creds = alertServices[0].credentials;
                    } else {
                        // Thử tìm theo tên instance
                        for (const key of Object.keys(vcap)) {
                            const found = vcap[key].find((s: any) => s.name === "cnma_internallunchorder_alert_notification" || s.label === "alert-notification");
                            if (found) creds = found.credentials;
                        }
                    }
                } catch (e) {
                    console.warn("Failed to parse VCAP_SERVICES:", e);
                }
            }

            // 2. Fallback lấy từ cấu hình mà CAP đã bind (có thể bị CAP đổi tên uaa.url)
            if (!creds) {
                const ansService = cds.env.requires?.["cnma_internallunchorder_alert_notification"] || cds.env.requires?.["alert-notification"];
                if (ansService && ansService.credentials) {
                    creds = ansService.credentials;
                }
            }
            
            if (creds) {
                console.log("==> CREDS OBJECT:", creds);
                this.ansClient = new AlertNotificationClient({
                    authentication: new OAuthAuthentication({
                        username: creds.client_id || creds.clientid || creds.uaa?.clientid,
                        password: creds.client_secret || creds.clientsecret || creds.uaa?.clientsecret,
                        oAuthTokenUrl: creds.oauth_url || (creds.uaa ? creds.uaa.url + "/oauth/token?grant_type=client_credentials" : "")
                    }),
                    region: RegionUtils.EU10
                });

                // console.log("ansClient: ", this.ansClient)
            } else {
                throw new Error("Alert Notification service credentials not found! Vui lòng Ctrl+C tắt server hiện tại và chạy lại lệnh 'npm run start:hybrid:backend'.");
            }
        }
        return this.ansClient;
    }

    /**
     * Send a simple notification (title & description only)
     */
    async sendSimpleNotification(
        recipients: string[],
        title: string,
        description: string
    ) {
        const alert = await this.getNotificationService()
        return await alert.notify({
            recipients,
            title,
            description
        })
    }

    /**
     * Send a typed notification using the InquiryOrdered event
     */
    async sendInquiryNotification(
        recipients: string[],
        data: {
            title: string
            message: string
            description: string
            number: string
            customerName: string
            carName: string
        }
    ) {
        const alert = await this.getNotificationService()
        return await alert.notify("InquiryOrdered", {
            recipients,
            data
        })
    }

    /**
     * Send an inquiry notification via Alert Notification Service (ANS)
     */
    async sendAnsInquiryNotification(
        recipients: string[],
        data: {
            title: string
            message: string
            description: string
            number: string
            customerName: string
            carName: string
        }
    ) {
        const client = this.getANSClient();
        return await client.sendEvent({
            eventType: "InquiryOrdered",
            resource: {
                resourceName: "CarShop Inquiry System",
                resourceType: "app"
            },
            severity: Severity.INFO,
            category: Category.NOTIFICATION,
            subject: data.title,
            body: data.description + (data.message ? `\n\nMessage: ${data.message}` : ""),
            tags: {
                customerName: data.customerName,
                carName: data.carName,
                number: data.number
            }
        });
    }

    /**
     * Generate the next sequential Inquiry number based on existing records
     */
    async generateNextInquiryNumber(srv: cds.Service): Promise<string> {
        const { Inquiry } = srv.entities
        const inquiries = await SELECT.from(Inquiry).columns("number")
        
        let maxNumber = 0
        for (const inq of inquiries) {
            if (inq.number && inq.number.startsWith("INQ-")) {
                const num = parseInt(inq.number.replace("INQ-", ""), 10)
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num
                }
            }
        }
        return `INQ-${maxNumber + 1}`
    }

    /**
     * Process and send the inquiry notification
     */
    async processInquiryNotification(srv: cds.Service, req: cds.Request, data: any) {
        // Handle CAP returning custom Iterables (like cds.List) that might not support [0]
        let record = data;
        if (record && !record.ID) {
            if (typeof record[Symbol.iterator] === 'function') {
                for (const item of record) {
                    record = item;
                    break;
                }
            } else if (record.length > 0) {
                record = record[0];
            }
        }

        if (!record || !record.ID) {
            console.warn("==> Could not find ID in data. Aborting notification.", JSON.stringify(data));
            return;
        }

        // Re-fetch the full inquiry inside the same transaction to ensure we get
        // generated fields (like number) and can expand associations correctly.
        const { Inquiry } = srv.entities;
        const fullInquiry = await cds.tx(req).run(
            SELECT.one.from(Inquiry).where({ ID: record.ID }).columns((i: any) => {
                i.ID;
                i.title;
                i.message;
                i.description;
                i.number;
                i.customer((c: any) => c.name);
                i.car((c: any) => c.name);
            })
        );

        console.log("==> fullInquiry fetched:", JSON.stringify(fullInquiry, null, 2));
        console.log("==> req data:", JSON.stringify(record, null, 2));

        const customerName = fullInquiry?.customer?.name || record.customer?.name || req.user?.id || "anonymous";
        const carName = fullInquiry?.car?.name || record.car?.name || "Unknown Car";
        const number = fullInquiry?.number || record.number || "";
        const title = fullInquiry?.title || record.title || "New Car Inquiry";
        const message = fullInquiry?.message || record.message || "";
        const description = fullInquiry?.description || record.description || "A customer has submitted a new inquiry.";

        const recipients = record.recipients || ["stghoainam4002@gmail.com", "nam.nguyen@conarum.com"];

        const notificationData = {
            title,
            message,
            description,
            number,
            customerName,
            carName
        };

        // Tuỳ chọn: dùng ANS thay vì Fiori Notification
        const useANS = true; 

        // if (useANS) {
        // } else {
        //     return this.sendInquiryNotification(recipients, notificationData);
        // }
        return this.sendAnsInquiryNotification(recipients, notificationData);
    }
}