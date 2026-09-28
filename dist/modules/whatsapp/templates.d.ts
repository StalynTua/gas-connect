/**
 * Plantillas de mensajes y botones interactivos para WhatsApp (Evolution API)
 * Adaptados al contexto local de Ibarra, Ecuador.
 */
export declare const whatsappTemplates: {
    welcome: () => {
        text: string;
    };
    askLandmark: () => {
        text: string;
    };
    cylinderTypeButtons: () => {
        text: string;
        buttons: Array<{
            id: string;
            label: string;
        }>;
    };
    quantityButtons: () => {
        text: string;
        buttons: Array<{
            id: string;
            label: string;
        }>;
    };
    emptyCylinderCheck: (quantity: number) => {
        text: string;
        buttons: Array<{
            id: string;
            label: string;
        }>;
    };
    noEmptyWarning: () => {
        text: string;
    };
    orderConfirmed: (params: {
        quantity: number;
        totalCost: number;
        landmark?: string;
    }) => {
        text: string;
    };
    truckAssigned: (params: {
        licensePlate: string;
        helperName: string;
        driverName: string;
        etaMinutes: number;
    }) => {
        text: string;
    };
    partialEmergencyOffer: (params: {
        immediateStock: number;
        immediateEtaMinutes: number;
        fullEtaMinutes: number;
    }) => {
        text: string;
        buttons: Array<{
            id: string;
            label: string;
        }>;
    };
    noTrucksAvailable: (nextRouteTime?: string) => {
        text: string;
    };
    orderDelivered: (params: {
        orderId: string;
        totalPaid: number;
    }) => {
        text: string;
    };
};
