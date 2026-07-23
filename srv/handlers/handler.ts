import cds from "@sap/cds"
import { CarShopService } from "../services/service"

export default async function Handler(srv: cds.Service) {
    const service = new CarShopService()

    srv.before("CREATE", "Inquiry", async (req: cds.Request) => {
        req.data.number = await service.generateNextInquiryNumber(srv)
    })

    srv.after("CREATE", "Inquiry", async (data: any, req: cds.Request) => {
        try {
            await service.processInquiryNotification(srv, req, data);
        } catch (err) {
            console.error("Failed to send notification for Inquiry:", err);
        }
    })
}