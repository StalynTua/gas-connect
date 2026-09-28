"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderNotifierService = exports.OrderNotifierService = void 0;
const evolution_client_js_1 = require("./evolution.client.js");
const templates_js_1 = require("./templates.js");
class OrderNotifierService {
    /**
     * Notifica al cliente cuando el camión ha aceptado el despacho en su PWA
     */
    async notifyTruckAssigned(info) {
        const template = templates_js_1.whatsappTemplates.truckAssigned({
            licensePlate: info.licensePlate,
            driverName: info.driverName,
            helperName: info.helperName,
            etaMinutes: info.etaMinutes,
        });
        return evolution_client_js_1.evolutionClient.sendTextMessage(info.customerPhone, template.text);
    }
    /**
     * Notifica al cliente cuando el ayudante confirma la entrega y cobro
     */
    async notifyOrderCompleted(customerPhone, orderId, totalPaid) {
        const template = templates_js_1.whatsappTemplates.orderDelivered({
            orderId,
            totalPaid,
        });
        return evolution_client_js_1.evolutionClient.sendTextMessage(customerPhone, template.text);
    }
    /**
     * Envía botones de negociación de emergencia si el camión más cercano tiene stock insuficiente
     */
    async notifyPartialOffer(customerPhone, params) {
        const template = templates_js_1.whatsappTemplates.partialEmergencyOffer(params);
        return evolution_client_js_1.evolutionClient.sendButtonMessage(customerPhone, template.text, template.buttons);
    }
    /**
     * Notifica que no hay camiones disponibles y ofrece franja horaria programada
     */
    async notifyNoTrucksScheduled(customerPhone, nextRouteTime) {
        const template = templates_js_1.whatsappTemplates.noTrucksAvailable(nextRouteTime);
        return evolution_client_js_1.evolutionClient.sendTextMessage(customerPhone, template.text);
    }
}
exports.OrderNotifierService = OrderNotifierService;
exports.orderNotifierService = new OrderNotifierService();
//# sourceMappingURL=order-notifier.service.js.map