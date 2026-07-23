import cds from "@sap/cds"

export class CarShopService {
    private alertService: any

    async getNotificationService() {
        if (!this.alertService) {
            this.alertService = await cds.connect.to("notifications")
        }
        return this.alertService
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
        // Re-fetch the full inquiry inside the same transaction to ensure we get
        // generated fields (like number) and can expand associations correctly.
        const { Inquiry } = srv.entities;
        const fullInquiry = await cds.tx(req).run(
            SELECT.one.from(Inquiry).where({ ID: data.ID }).columns((i: any) => {
                i.ID;
                i.title;
                i.message;
                i.description;
                i.number;
                i.customer((c: any) => c.name);
                i.car((c: any) => c.name);
            })
        );

        const customerName = fullInquiry?.customer?.name || data.customer?.name || req.user?.id || "anonymous";
        const carName = fullInquiry?.car?.name || data.car?.name || "Unknown Car";
        const number = fullInquiry?.number || data.number || "";
        const title = fullInquiry?.title || data.title || "New Car Inquiry";
        const message = fullInquiry?.message || data.message || "";
        const description = fullInquiry?.description || data.description || "A customer has submitted a new inquiry.";

        const recipients = data.recipients || ["stghoainam4002@gmail.com", "nam.nguyen@conarum.com"];

        return this.sendInquiryNotification(
            recipients,
            {
                title,
                message,
                description,
                number,
                customerName,
                carName
            }
        );
    }
}