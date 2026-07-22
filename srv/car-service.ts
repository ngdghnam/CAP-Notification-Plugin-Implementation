import cds from "@sap/cds"
import Handler from "./handlers/handler"

export class CARSHOP_SRV extends cds.ApplicationService {
    async init(): Promise<void> {
        await Handler(this)
        await super.init()
    }
}