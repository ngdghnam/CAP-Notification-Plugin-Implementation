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
}