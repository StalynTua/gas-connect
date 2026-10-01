import dotenv from 'dotenv';
import { evolutionClient } from '../src/modules/whatsapp/evolution.client.js';

dotenv.config();

async function main() {
  console.log('===================================================');
  console.log('📱 GasConnect Ibarra - Evolution API Setup');
  console.log('===================================================');

  const instanceName = evolutionClient.getInstanceName();
  const baseUrl = evolutionClient.getBaseUrl();

  console.log(`🌐 Servidor Evolution API: ${baseUrl}`);
  console.log(`📌 Nombre de Instancia:    ${instanceName}`);
  console.log('---------------------------------------------------');

  console.log('⏳ 1. Verificando estado de la instancia WhatsApp...');
  let state = await evolutionClient.getConnectionState();

  if (!state.connected && state.state === 'disconnected') {
    console.log('🔨 2. Creando instancia en Evolution API...');
    const created = await evolutionClient.createInstance();
    if (created) {
      console.log('✅ Instancia creada o ya existente.');
    } else {
      console.log('⚠️ No se pudo crear la instancia. Verifica si el contenedor de Evolution API está corriendo.');
    }
  } else {
    console.log(`✅ Estado actual de la instancia: ${state.state}`);
  }

  console.log('🔗 3. Configurando URL de Webhook...');
  const webhookUrl = process.env.WEBHOOK_GLOBAL_URL || 'http://localhost:8000/api/v1/whatsapp/webhook';
  const webhookOk = await evolutionClient.setWebhook(webhookUrl);

  if (webhookOk) {
    console.log(`✅ Webhook configurado correctamente a: ${webhookUrl}`);
  } else {
    console.log(`⚠️ No se pudo registrar el Webhook en Evolution API.`);
  }

  console.log('📲 4. Verificando código QR de conexión WhatsApp...');
  state = await evolutionClient.getConnectionState();

  if (state.connected) {
    console.log('🎉 ¡WhatsApp ya se encuentra CONECTADO y listo para recibir pedidos!');
  } else {
    const qrData = await evolutionClient.getQrCode();
    if (qrData) {
      console.log('\n===================================================');
      console.log('📸 CÓDIGO QR / PAIRING CODE PARA ESCANEAR EN WHATSAPP');
      console.log('===================================================');
      if (qrData.pairingCode) {
        console.log(`🔑 Código de Emparejamiento (Pairing Code): ${qrData.pairingCode}`);
      }
      if (qrData.code) {
        console.log(`📱 QR Code String: ${qrData.code}`);
      }
      if (qrData.base64) {
        console.log(`🖼️ Imagen Base64 del QR disponible (${qrData.base64.substring(0, 50)}...)`);
      }
      console.log('===================================================\n');
      console.log('💡 Abre WhatsApp en tu teléfono -> Dispositivos vinculados -> Vincular un dispositivo.');
    } else {
      console.log('ℹ️ No se obtuvo código QR. Es posible que el servicio aún se esté iniciando.');
    }
  }

  console.log('===================================================');
  console.log('✨ Configuración finalizada.');
  console.log('===================================================');
}

main().catch((err) => {
  console.error('❌ Error fatal en el script de configuración:', err);
  process.exit(1);
});
