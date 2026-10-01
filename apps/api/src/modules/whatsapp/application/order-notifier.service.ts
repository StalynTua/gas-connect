import type { IMessageSender } from '../domain/message-sender.port.js';
import { whatsappTemplates } from '../domain/templates.js';

export interface TruckAssignmentInfo {
  customerPhone: string;
  orderId: string;
  licensePlate: string;
  driverName: string;
  helperName: string;
  etaMinutes: number;
}

export class OrderNotifierService {
  constructor(private readonly messageSender: IMessageSender) {}

  /**
   * Notifica al cliente cuando el camión ha aceptado el despacho en su PWA
   */
  async notifyTruckAssigned(info: TruckAssignmentInfo): Promise<boolean> {
    const template = whatsappTemplates.truckAssigned({
      licensePlate: info.licensePlate,
      driverName: info.driverName,
      helperName: info.helperName,
      etaMinutes: info.etaMinutes,
    });

    return this.messageSender.sendTextMessage(info.customerPhone, template.text);
  }

  /**
   * Notifica al cliente cuando el ayudante confirma la entrega y cobro
   */
  async notifyOrderCompleted(customerPhone: string, orderId: string, totalPaid: number): Promise<boolean> {
    const template = whatsappTemplates.orderDelivered({
      orderId,
      totalPaid,
    });

    return this.messageSender.sendTextMessage(customerPhone, template.text);
  }

  /**
   * Envía botones de negociación de emergencia si el camión más cercano tiene stock insuficiente
   */
  async notifyPartialOffer(
    customerPhone: string,
    params: {
      immediateStock: number;
      immediateEtaMinutes: number;
      fullEtaMinutes: number;
    }
  ): Promise<boolean> {
    const template = whatsappTemplates.partialEmergencyOffer(params);
    return this.messageSender.sendButtonMessage(customerPhone, template.text, template.buttons);
  }

  /**
   * Notifica que no hay camiones disponibles y ofrece franja horaria programada
   */
  async notifyNoTrucksScheduled(customerPhone: string, nextRouteTime?: string): Promise<boolean> {
    const template = whatsappTemplates.noTrucksAvailable(nextRouteTime);
    return this.messageSender.sendTextMessage(customerPhone, template.text);
  }
}
