import cds from "@sap/cds"
import { CarShopService } from "../services/service"

export default async function Handler(srv: cds.Service) {
    const service = new CarShopService()

    srv.before("CREATE", "Inquiry", async (req: cds.Request) => {
        req.data.number = await service.generateNextInquiryNumber(srv)
    })

    srv.after("CREATE", "Inquiry", async (data: any, req: cds.Request) => {
        try {
            const customerName = data.customer?.name || req.user?.id
            const carName = data.car?.name
            const recipients = data.recipients || ["stghoainam4002@gmail.com", "nam.nguyen@conarum.com"]

            await service.sendInquiryNotification(
                recipients,
                {
                    title: data.title,
                    message: data.message,
                    description: data.description,
                    number: data.number,
                    customerName,
                    carName
                }
            )
        } catch (err) {
            console.error("Failed to send notification for Inquiry:", err)
        }
    })
}