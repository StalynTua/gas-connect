export interface TruckAssignmentInfo {
    customerPhone: string;
    orderId: string;
    licensePlate: string;
    driverName: string;
    helperName: string;
    etaMinutes: number;
}
export declare class OrderNotifierService {
    /**
     * Notifica al cliente cuando el camión ha aceptado el despacho en su PWA
     */
    notifyTruckAssigned(info: TruckAssignmentInfo): Promise<boolean>;
    /**
     * Notifica al cliente cuando el ayudante confirma la entrega y cobro
     */
    notifyOrderCompleted(customerPhone: string, orderId: string, totalPaid: number): Promise<boolean>;
    /**
     * Envía botones de negociación de emergencia si el camión más cercano tiene stock insuficiente
     */
    notifyPartialOffer(customerPhone: string, params: {
        immediateStock: number;
        immediateEtaMinutes: number;
        fullEtaMinutes: number;
    }): Promise<boolean>;
    /**
     * Notifica que no hay camiones disponibles y ofrece franja horaria programada
     */
    notifyNoTrucksScheduled(customerPhone: string, nextRouteTime?: string): Promise<boolean>;
}
export declare const orderNotifierService: OrderNotifierService;
