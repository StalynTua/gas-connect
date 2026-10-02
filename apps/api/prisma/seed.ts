import { PrismaClient, TruckStatus, InventoryChangeType, AccountRole } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed de GasConnect Ibarra...');

  // 1. Limpiar datos existentes
  await prisma.accountSession.deleteMany();
  await prisma.account.deleteMany();
  await prisma.dispatchAttempt.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.truck.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.distributor.deleteMany();

  // 2. Crear Distribuidora Piloto en Ibarra
  const distributor = await prisma.distributor.create({
    data: {
      businessName: 'Distribuidora San Francisco - Agip Ibarra',
      phoneNumber: '0991234567',
      officialCodeArch: 'ARCH-IMB-0842',
      isActive: true,
    },
  });

  console.log(`✅ Distribuidora creada: ${distributor.businessName} (ID: ${distributor.id})`);

  // 3. Crear 4 Camiones Piloto en sectores estratégicos de Ibarra
  const trucksData = [
    {
      id: 'truck-ceibos-1',
      licensePlate: 'IAA-1041',
      driverName: 'Carlos Pérez',
      helperName: 'Luis Muenala',
      helperPhone: '0998877661',
      stockFull: 40,
      lat: 0.3475, // Los Ceibos
      lng: -78.1285,
      sector: 'Los Ceibos',
    },
    {
      id: 'truck-caranqui-2',
      licensePlate: 'IAB-2082',
      driverName: 'Marco Imbaquingo',
      helperName: 'Jorge Quilumba',
      helperPhone: '0998877662',
      stockFull: 35,
      lat: 0.3340, // Caranqui
      lng: -78.1250,
      sector: 'Caranqui',
    },
    {
      id: 'truck-centro-3',
      licensePlate: 'IAC-3093',
      driverName: 'Segundo Morales',
      helperName: 'David Cachimuel',
      helperPhone: '0998877663',
      stockFull: 45,
      lat: 0.3520, // Centro / Parque Pedro Moncayo
      lng: -78.1220,
      sector: 'Centro Histórico',
    },
    {
      id: 'truck-yacucalle-4',
      licensePlate: 'IAD-4014',
      driverName: 'Wilson Espinoza',
      helperName: 'Andrés Farinango',
      helperPhone: '0998877664',
      stockFull: 4, // Alerta stock bajo
      lat: 0.3440, // Yacucalle
      lng: -78.1180,
      sector: 'Yacucalle',
    },
  ];

  for (const t of trucksData) {
    const truck = await prisma.truck.create({
      data: {
        id: t.id,
        distributorId: distributor.id,
        licensePlate: t.licensePlate,
        driverName: t.driverName,
        helperName: t.helperName,
        helperPhone: t.helperPhone,
        currentStockFull: t.stockFull,
        currentStockEmpty: 0,
        status: TruckStatus.IDLE,
        lastLatitude: t.lat,
        lastLongitude: t.lng,
        lastPingAt: new Date(),
      },
    });

    // Actualizar columna geometry PostGIS usando SQL nativo
    await prisma.$executeRawUnsafe(`
      UPDATE trucks 
      SET last_known_location = ST_SetSRID(ST_MakePoint(${t.lng}, ${t.lat}), 4326)
      WHERE id = '${truck.id}';
    `);

    // Registrar log de carga inicial
    await prisma.inventoryLog.create({
      data: {
        truckId: truck.id,
        changeType: InventoryChangeType.INITIAL_LOAD,
        quantityDelta: t.stockFull,
        resultingStock: t.stockFull,
      },
    });

    // Crear cuenta de acceso para el camión / ayudante
    const defaultPasswordHash = await argon2.hash('GasIbarra2025!', {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    await prisma.account.create({
      data: {
        username: t.licensePlate,
        passwordHash: defaultPasswordHash,
        role: AccountRole.TRUCK_HELPER,
        isActive: true,
        truckId: truck.id,
      },
    });

    console.log(`🚚 Camión ${t.licensePlate} (${t.sector}) - Stock: ${t.stockFull} cilindros | Cuenta creada (clave: GasIbarra2025!).`);
  }


  // 4. Crear cliente de prueba en Ibarra
  const customer = await prisma.customer.create({
    data: {
      phoneNumber: '593999888777',
      defaultName: 'María Benalcázar',
      defaultLandmark: 'Casa esquinera blanca de dos pisos, junto a la panadería',
    },
  });

  console.log(`👤 Cliente de prueba creado: ${customer.defaultName} (${customer.phoneNumber})`);
  console.log('✨ Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
