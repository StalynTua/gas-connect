import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationService } from '../../src/modules/whatsapp/conversation.service.js';

describe('WhatsApp Conversation State Machine', () => {
  let service: ConversationService;
  const userPhone = '593991234567';

  beforeEach(() => {
    service = new ConversationService();
  });

  it('should run full 5-step conversational order workflow in Ibarra', async () => {
    // Paso 1: Saludo inicial
    const step1 = await service.processInboundMessage({
      from: userPhone,
      text: 'Hola, necesito gas por favor',
    });
    expect(step1.nextStep).toBe('AWAITING_LOCATION');
    expect(step1.replyText).toContain('ubicación actual');

    // Paso 2: Envío de ubicación GPS (Los Ceibos)
    const step2 = await service.processInboundMessage({
      from: userPhone,
      location: { lat: 0.3475, lng: -78.1285 },
    });
    expect(step2.nextStep).toBe('AWAITING_LANDMARK');
    expect(step2.replyText).toContain('referencia visual');

    // Paso 3: Envío de referencia de fachada
    const step3 = await service.processInboundMessage({
      from: userPhone,
      text: 'Casa de 2 pisos amarilla, reja negra con portón corredizo',
    });
    expect(step3.nextStep).toBe('AWAITING_CYLINDER_TYPE');
    expect(step3.buttons).toHaveLength(2);

    // Paso 4: Selección de tipo de cilindro
    const step4 = await service.processInboundMessage({
      from: userPhone,
      buttonId: 'btn_domestico',
    });
    expect(step4.nextStep).toBe('AWAITING_QUANTITY');
    expect(step4.buttons).toHaveLength(3);

    // Paso 5: Selección de cantidad (2 cilindros)
    const step5 = await service.processInboundMessage({
      from: userPhone,
      buttonId: 'btn_qty_2',
    });
    expect(step5.nextStep).toBe('AWAITING_EMPTY_VERIFICATION');
    expect(step5.replyText).toContain('2 envases vacíos');

    // Paso 6: Confirmación de envases vacíos listos (con candidato en rango)
    const mockTruck = {
      id: 'truck-ceibos-1',
      distributorId: 'dist-1',
      licensePlate: 'IAA-1234',
      driverName: 'Carlos Minda',
      helperName: 'Juan Pérez',
      helperPhone: '593981112233',
      currentStockFull: 12,
      latitude: 0.348,
      longitude: -78.129,
      radialDistanceMeters: 150,
      roadDistanceMeters: 280,
      etaMinutes: 2,
    };

    const step6 = await service.processInboundMessage({
      from: userPhone,
      buttonId: 'btn_has_empty',
      mockCandidates: [mockTruck],
    });
    expect(step6.nextStep).toBe('DISPATCH_IN_PROGRESS');
    expect(step6.replyText).toContain('¡Pedido registrado con éxito!');
    expect(step6.replyText).toContain('$6.00');
  });

  it('should notify user and suggest scheduled route if no trucks are available in neighborhood', async () => {
    const userPhone2 = '593997778899';
    await service.processInboundMessage({ from: userPhone2, text: 'Hola' });
    await service.processInboundMessage({ from: userPhone2, location: { lat: 0.35, lng: -78.12 } });
    await service.processInboundMessage({ from: userPhone2, text: 'Casa blanca de teja' });
    await service.processInboundMessage({ from: userPhone2, buttonId: 'btn_domestico' });
    await service.processInboundMessage({ from: userPhone2, buttonId: 'btn_qty_1' });

    // Confirmación con 0 camiones disponibles
    const step6 = await service.processInboundMessage({
      from: userPhone2,
      buttonId: 'btn_has_empty',
      mockCandidates: [],
    });

    expect(step6.nextStep).toBe('DISPATCH_IN_PROGRESS');
    expect(step6.replyText).toContain('atendiendo otras entregas');
    expect(step6.replyText).toContain('11:45 AM');
  });

  it('should reset session when user types "cancelar"', async () => {
    await service.processInboundMessage({
      from: userPhone,
      text: 'Hola',
    });

    const cancelStep = await service.processInboundMessage({
      from: userPhone,
      text: 'Cancelar',
    });

    expect(cancelStep.nextStep).toBe('IDLE');
    expect(cancelStep.replyText).toContain('Pedido cancelado');

    const session = service.getSession(userPhone);
    expect(session.currentStep).toBe('IDLE');
  });
});
