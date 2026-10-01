/**
 * Plantillas de mensajes y botones interactivos para WhatsApp (Evolution API)
 * Adaptados al contexto local de Ibarra, Ecuador.
 */

export const whatsappTemplates = {
  welcome: (): { text: string } => ({
    text:
      '👋 ¡Hola! Bienvenido a **GasConnect Ibarra**.\n\nPara enviarte el camión repartidor que esté circulando más cerca de tu casa con el menor tiempo de espera, por favor comparte tu **ubicación actual** por aquí 📍 (Usa el clip 📎 -> Ubicación en tiempo real o actual).',
  }),

  askLandmark: (): { text: string } => ({
    text:
      '¡Ubicación recibida! 🎯\n\nPara que el repartidor no se pierda ni toque la bocina innecesariamente, indícanos una **referencia visual de tu fachada** (ej: *"Casa esquinera blanca de 2 pisos, portón negro, junto a la tienda"*):',
  }),

  cylinderTypeButtons: (): {
    text: string;
    buttons: Array<{ id: string; label: string }>;
  } => ({
    text: '¿Qué tipo de gas requieres hoy?',
    buttons: [
      { id: 'btn_domestico', label: '🔵 Doméstico 15kg ($3.00)' },
      { id: 'btn_industrial', label: '🔴 Industrial 15kg ($15.00)' },
    ],
  }),

  quantityButtons: (): {
    text: string;
    buttons: Array<{ id: string; label: string }>;
  } => ({
    text: '¿Cuántos cilindros necesitas recibir?',
    buttons: [
      { id: 'btn_qty_1', label: '1 cilindro' },
      { id: 'btn_qty_2', label: '2 cilindros' },
      { id: 'btn_qty_3', label: '3 o más' },
    ],
  }),

  emptyCylinderCheck: (quantity: number): {
    text: string;
    buttons: Array<{ id: string; label: string }>;
  } => ({
    text: `⚠️ **Verificación de envase:**\n\n¿Dispones de **${quantity} envase(s) vacío(s)** del mismo tipo para entregar al momento del intercambio?`,
    buttons: [
      { id: 'btn_has_empty', label: '✅ Sí, tengo el envase' },
      { id: 'btn_no_empty', label: '❌ No tengo envase' },
    ],
  }),

  noEmptyWarning: (): { text: string } => ({
    text:
      'ℹ️ **Importante:** Si no dispones de envase vacío para intercambiar, se deberá cancelar el valor de compra del cilindro nuevo ($50 aprox) al recibirlo. ¿Deseas continuar? (Responde *"Sí"* para despachar o *"Cancelar"*).',
  }),

  orderConfirmed: (params: {
    quantity: number;
    totalCost: number;
    landmark?: string;
  }): { text: string } => ({
    text: `✅ ¡Pedido registrado con éxito!\n\n📦 **Detalle:** ${params.quantity} cilindro(s)\n💰 **Total a pagar:** $${params.totalCost.toFixed(2)} (Efectivo)\n📍 **Referencia:** "${params.landmark || 'Sin referencia'}"\n\nEstamos asignando al camión más cercano que circula por tu calle. Te avisaremos en segundos cuando acepte. 🚚`,
  }),

  truckAssigned: (params: {
    licensePlate: string;
    helperName: string;
    driverName: string;
    etaMinutes: number;
  }): { text: string } => ({
    text: `🚚 **¡Camión asignado!**\n\nEl camión con placas **${params.licensePlate}** (Conductor: ${params.driverName}, Ayudante: ${params.helperName}) ya va en camino hacia tu domicilio.\n\n⏱️ **Tiempo estimado de llegada:** ~${params.etaMinutes} minutos.\n\nTen listo el efectivo exacto y los cilindros vacíos en la puerta. ¡Gracias por preferirnos!`,
  }),

  partialEmergencyOffer: (params: {
    immediateStock: number;
    immediateEtaMinutes: number;
    fullEtaMinutes: number;
  }): {
    text: string;
    buttons: Array<{ id: string; label: string }>;
  } => ({
    text: `⚠️ **Aviso de Stock Inmediato:**\n\nEl camión más cercano solo dispone de **${params.immediateStock} cilindro(s)** y puede llegar en **${params.immediateEtaMinutes} min**.\nEl siguiente camión con todo tu pedido llegará en **${params.fullEtaMinutes} min**.\n\n¿Qué prefieres hacer?`,
    buttons: [
      { id: 'btn_accept_partial', label: `Aceptar ${params.immediateStock} ya` },
      { id: 'btn_wait_full', label: 'Esperar pedido completo' },
    ],
  }),

  noTrucksAvailable: (nextRouteTime = '11:45 AM'): { text: string } => ({
    text: `⚠️ En este instante nuestros camiones en tu barrio están atendiendo otras entregas.\n\nEl próximo recorrido estimado pasará a las **${nextRouteTime}**. ¿Deseas dejarlo programado para esa hora?`,
  }),

  orderDelivered: (params: { orderId: string; totalPaid: number }): { text: string } => ({
    text: `✨ ¡Entrega completada!\n\nTu pedido **#${params.orderId}** ha sido entregado exitosamente por un total de **$${params.totalPaid.toFixed(2)}**.\n\n¡Gracias por utilizar GasConnect Ibarra! Para solicitar más gas en el futuro, solo vuelve a escribirnos por este chat. 👍`,
  }),
};
