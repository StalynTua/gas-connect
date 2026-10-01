import type { Coordinates } from '../../../shared/coordinates.types.js';
import type { CandidateTruck } from '../../dispatch/domain/candidate-truck.entity.js';
import type { StartDispatchUseCase } from '../../dispatch/application/start-dispatch.use-case.js';
import type { IOrderRepository } from '../../orders/domain/order.repository.js';
import type { DialogStep } from '../domain/dialog-state.entity.js';
import type { IMessageSender } from '../domain/message-sender.port.js';
import type { IUserSessionRepository } from '../domain/user-session.repository.js';

export interface InboundMessage {
  from: string; // Número de teléfono (ej. 593991234567)
  text?: string;
  location?: Coordinates;
  buttonId?: string;
  mockCandidates?: CandidateTruck[];
}

export interface ConversationReply {
  nextStep: DialogStep;
  replyText: string;
  buttons?: Array<{ id: string; label: string }>;
}

export class ProcessInboundMessageUseCase {
  constructor(
    private readonly sessionRepo: IUserSessionRepository,
    private readonly messageSender: IMessageSender,
    private readonly orderRepo: IOrderRepository,
    private readonly startDispatchUseCase: StartDispatchUseCase
  ) {}

  async execute(message: InboundMessage): Promise<ConversationReply> {
    const session = this.sessionRepo.getSession(message.from);
    session.updatedAt = new Date();

    const normalizedText = (message.text || message.buttonId || '').trim().toLowerCase();

    // Si escribe "cancelar" o "reiniciar", resetea
    if (normalizedText === 'cancelar' || normalizedText === 'reiniciar' || normalizedText === 'reset') {
      this.sessionRepo.resetSession(message.from);
      const replyText = '❌ Pedido cancelado. Cuando necesites gas de nuevo, escríbenos *"Hola"*. ¡Que tengas un buen día!';
      await this.messageSender.sendTextMessage(message.from, replyText);
      return { nextStep: 'IDLE', replyText };
    }

    switch (session.currentStep) {
      case 'IDLE': {
        session.currentStep = 'AWAITING_LOCATION';
        const replyText =
          '¡Hola! 👋 Bienvenido a **Gas Ibarra**.\n\nPara enviarte el camión que ya está pasando por tu sector:\n📍 **Por favor, compártenos tu ubicación actual** usando el botón de clip/adjuntar 📎 de WhatsApp.';
        await this.messageSender.sendTextMessage(message.from, replyText);
        return { nextStep: 'AWAITING_LOCATION', replyText };
      }

      case 'AWAITING_LOCATION': {
        if (!message.location) {
          const replyText =
            '⚠️ Necesitamos tu ubicación exacta de WhatsApp.\n\nToca el ícono de **Adjuntar (+ o 📎)** $\\rightarrow$ **Ubicación** $\\rightarrow$ **Enviar mi ubicación actual**.';
          await this.messageSender.sendTextMessage(message.from, replyText);
          return { nextStep: 'AWAITING_LOCATION', replyText };
        }

        session.deliveryLocation = message.location;
        session.currentStep = 'AWAITING_LANDMARK';
        const replyText =
          '📍 ¡Ubicación recibida con éxito!\n\n¿Alguna **referencia visual de tu casa** para que el chofer no se pierda? (Ej: *"Casa amarilla de 2 pisos, reja negra"* o escribe *"No"*):';
        await this.messageSender.sendTextMessage(message.from, replyText);
        return { nextStep: 'AWAITING_LANDMARK', replyText };
      }

      case 'AWAITING_LANDMARK': {
        const landmark = message.text && message.text.toLowerCase() !== 'no' ? message.text.trim() : 'Sin referencia';
        session.landmark = landmark;
        session.currentStep = 'AWAITING_CYLINDER_TYPE';

        const replyText = '¿Qué tipo de cilindro necesitas?';
        const buttons = [
          { id: 'btn_domestico', label: 'Doméstico 15kg ($3.00)' },
          { id: 'btn_industrial', label: 'Industrial 45kg' },
        ];

        await this.messageSender.sendButtonMessage(message.from, replyText, buttons);
        return { nextStep: 'AWAITING_CYLINDER_TYPE', replyText, buttons };
      }

      case 'AWAITING_CYLINDER_TYPE': {
        if (normalizedText.includes('industrial') || message.buttonId === 'btn_industrial') {
          session.cylinderType = 'INDUSTRIAL_45KG';
        } else {
          session.cylinderType = 'DOMESTIC_15KG';
        }

        session.currentStep = 'AWAITING_QUANTITY';
        const replyText = '¿Cuántos cilindros deseas solicitar?';
        const buttons = [
          { id: 'btn_qty_1', label: '1 Cilindro' },
          { id: 'btn_qty_2', label: '2 Cilindros' },
          { id: 'btn_qty_3', label: '3 Cilindros' },
        ];

        await this.messageSender.sendButtonMessage(message.from, replyText, buttons);
        return { nextStep: 'AWAITING_QUANTITY', replyText, buttons };
      }

      case 'AWAITING_QUANTITY': {
        let qty = 1;
        if (normalizedText.includes('2') || message.buttonId === 'btn_qty_2') qty = 2;
        if (normalizedText.includes('3') || message.buttonId === 'btn_qty_3') qty = 3;

        session.quantityRequested = qty;
        session.currentStep = 'AWAITING_EMPTY_VERIFICATION';

        const replyText = `⚠️ **Validación Importante:**\n¿Tienes ${qty === 1 ? 'el envase vacío' : `los ${qty} envases vacíos`} listos para entregar al camión?`;
        const buttons = [
          { id: 'btn_has_empty', label: 'Sí, tengo envases' },
          { id: 'btn_no_empty', label: 'No, necesito envase' },
        ];

        await this.messageSender.sendButtonMessage(message.from, replyText, buttons);
        return { nextStep: 'AWAITING_EMPTY_VERIFICATION', replyText, buttons };
      }

      case 'AWAITING_EMPTY_VERIFICATION': {
        if (normalizedText.includes('no') || message.buttonId === 'btn_no_empty') {
          session.hasEmptyCylinders = false;
          const replyText =
            'ℹ️ Ten en cuenta que si no dispones de envase vacío para intercambiar, se deberá cancelar el valor de compra del cilindro nuevo ($50 aprox) al recibirlo. ¿Deseas continuar? (Responde *"Sí"* para despachar o *"Cancelar"*).';
          await this.messageSender.sendTextMessage(message.from, replyText);
          return { nextStep: 'AWAITING_EMPTY_VERIFICATION', replyText };
        }

        session.hasEmptyCylinders = true;
        session.orderId = `ord-${Date.now()}`;
        session.currentStep = 'DISPATCH_IN_PROGRESS';

        const totalCost = (session.quantityRequested || 1) * 3.0;

        // Persistir la orden a través del repositorio de órdenes
        await this.orderRepo.createOrUpdate({
          orderId: session.orderId,
          phoneNumber: message.from,
          cylinderType: session.cylinderType || 'DOMESTIC_15KG',
          quantity: session.quantityRequested || 1,
          unitPrice: 3.0,
          totalAmount: totalCost,
          latitude: session.deliveryLocation!.lat,
          longitude: session.deliveryLocation!.lng,
          landmark: session.landmark || 'Sin referencia',
          status: 'OFFERED',
        });

        // Iniciar orquestador de despacho
        const dispatchSession = await this.startDispatchUseCase.execute({
          orderId: session.orderId,
          quantityRequested: session.quantityRequested || 1,
          deliveryLocation: session.deliveryLocation!,
          addressLandmark: session.landmark,
          mockCandidates: message.mockCandidates,
        });

        let replyText = '';
        if (dispatchSession.status === 'NO_TRUCKS_AVAILABLE') {
          replyText =
            '⚠️ En este instante nuestros camiones en tu barrio están atendiendo otras entregas.\n\nEl próximo recorrido estimado pasará a las **11:45 AM**. ¿Deseas dejarlo programado para esa hora?';
        } else {
          replyText = `✅ ¡Pedido registrado con éxito!\n\n📦 **Detalle:** ${session.quantityRequested} cilindro(s)\n💰 **Total a pagar:** $${totalCost.toFixed(2)} (Efectivo)\n📍 **Referencia:** "${session.landmark}"\n\nEstamos asignando al camión más cercano que circula por tu calle. Te avisaremos en segundos cuando acepte. 🚚`;
        }

        await this.messageSender.sendTextMessage(message.from, replyText);
        return { nextStep: 'DISPATCH_IN_PROGRESS', replyText };
      }

      default: {
        const replyText =
          'Tu pedido está en curso. Si deseas consultar el estado o necesitas cancelar, responde *"Cancelar"*.';
        await this.messageSender.sendTextMessage(message.from, replyText);
        return { nextStep: session.currentStep, replyText };
      }
    }
  }
}
