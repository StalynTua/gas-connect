import { useState, useEffect } from 'react';
import { Flame, RefreshCw, Radio } from 'lucide-react';
import { MetricsCards } from './components/MetricsCards.js';
import { LiveFleetMap, TruckPin } from './components/LiveFleetMap.js';
import { TrucksList } from './components/TrucksList.js';
import { ActivityLog, ActivityEvent } from './components/ActivityLog.js';
import { WhatsAppStatusCard } from './components/WhatsAppStatusCard.js';

const INITIAL_TRUCKS: TruckPin[] = [
  {
    id: 'truck-ceibos-1',
    licensePlate: 'IAA-1041',
    driverName: 'Carlos Minda',
    helperName: 'Juan Pérez',
    helperPhone: '0991112233',
    status: 'IN_TRANSIT',
    currentStockFull: 28,
    currentStockEmpty: 12,
    lastLatitude: 0.3475,
    lastLongitude: -78.1285,
    zone: 'Los Ceibos / Parque Céntrica',
  },
  {
    id: 'truck-caranqui-2',
    licensePlate: 'IAA-2052',
    driverName: 'Wilson Imbaquingo',
    helperName: 'Segundo Farinango',
    helperPhone: '0992223344',
    status: 'IDLE',
    currentStockFull: 34,
    currentStockEmpty: 6,
    lastLatitude: 0.3312,
    lastLongitude: -78.1345,
    zone: 'Caranqui / Atahualpa',
  },
  {
    id: 'truck-centro-3',
    licensePlate: 'IAA-3063',
    driverName: 'Rodrigo Benalcázar',
    helperName: 'Marcelo Ipiales',
    helperPhone: '0993334455',
    status: 'IN_TRANSIT',
    currentStockFull: 14,
    currentStockEmpty: 26,
    lastLatitude: 0.3541,
    lastLongitude: -78.1221,
    zone: 'Centro Histórico / La Merced',
  },
  {
    id: 'truck-yacucalle-4',
    licensePlate: 'IAA-4074',
    driverName: 'Luis Flores',
    helperName: 'Esteban Morales',
    helperPhone: '0994445566',
    status: 'IDLE',
    currentStockFull: 4, // Alerta bajo stock
    currentStockEmpty: 36,
    lastLatitude: 0.342,
    lastLongitude: -78.1189,
    zone: 'Yacucalle / Terminal Terrestre',
  },
];

const INITIAL_EVENTS: ActivityEvent[] = [
  {
    id: 'evt-1',
    timestamp: 'Hace 2 min',
    type: 'ORDER_DELIVERED',
    title: 'Entrega completada (1 cilindro doméstico)',
    description: 'Camión IAA-1041 cobró $3.00 en efectivo a cliente en Los Ceibos (ref: casa amarilla).',
    zone: 'Los Ceibos',
  },
  {
    id: 'evt-2',
    timestamp: 'Hace 5 min',
    type: 'OFFER_ACCEPTED',
    title: 'Despacho aceptado en cabina',
    description: 'Ayudante Marcelo Ipiales aceptó orden #ord-9231 con desvío vial estimado de 280m.',
    zone: 'Centro Histórico',
  },
  {
    id: 'evt-3',
    timestamp: 'Hace 11 min',
    type: 'STOCK_LOW',
    title: 'Alerta de stock bajo (4 cilindros restantes)',
    description: 'Camión IAA-4074 en Yacucalle necesita programar retorno a bodega para recarga.',
    zone: 'Yacucalle',
  },
  {
    id: 'evt-4',
    timestamp: 'Hace 14 min',
    type: 'ORDER_RECEIVED',
    title: 'Nuevo pedido vía WhatsApp',
    description: 'Cliente 0998877661 solicitó 2 cilindros en Caranqui mediante bot interactivo.',
    zone: 'Caranqui',
  },
];

export default function App() {
  const [trucks, setTrucks] = useState<TruckPin[]>(INITIAL_TRUCKS);
  const [metrics, setMetrics] = useState({
    totalTrucksActive: 4,
    totalStockAvailable: 80,
    completedOrdersToday: 48,
    totalCollectedToday: 144.0,
    lowStockAlertsCount: 1,
  });
  const [events, setEvents] = useState<ActivityEvent[]>(INITIAL_EVENTS);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFleetData = async () => {
    setLoading(true);
    try {
      const [resStatus, resMetrics, resEvents] = await Promise.all([
        fetch('/api/v1/fleet/status'),
        fetch('/api/v1/fleet/metrics'),
        fetch('/api/v1/fleet/events'),
      ]);

      if (resStatus.ok) {
        const dataStatus = await resStatus.json();
        if (dataStatus.trucks && dataStatus.trucks.length > 0) {
          setTrucks(dataStatus.trucks);
        }
      }

      if (resMetrics.ok) {
        const dataMetrics = await resMetrics.json();
        if (dataMetrics.metrics) {
          setMetrics(dataMetrics.metrics);
        }
      }

      if (resEvents.ok) {
        const dataEvents = await resEvents.json();
        if (dataEvents.events && dataEvents.events.length > 0) {
          setEvents(dataEvents.events);
        }
      }
    } catch {
      // Fallback a datos iniciales
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleetData();
    const interval = setInterval(fetchFleetData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">GasConnect Ibarra</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">
                  Ops Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">Coordinación en Tiempo Real de GLP Doméstico</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Sync Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs">
              <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span className="text-slate-300 font-medium">Flota en Vivo: Polling 5s</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchFleetData}
              disabled={loading}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Evolution API / WhatsApp Status & QR Scanner */}
        <WhatsAppStatusCard />

        {/* KPI Metrics */}
        <MetricsCards metrics={metrics} />

        {/* Fleet Grid: Map (2/3) + Truck List (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LiveFleetMap
              trucks={trucks}
              selectedTruckId={selectedTruckId}
              onSelectTruck={(id) => setSelectedTruckId(id)}
            />
          </div>
          <div className="lg:col-span-1">
            <TrucksList
              trucks={trucks}
              selectedTruckId={selectedTruckId}
              onSelectTruck={(id) => setSelectedTruckId(id)}
            />
          </div>
        </div>

        {/* Live Event Stream */}
        <ActivityLog events={events} />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        GasConnect Ibarra &copy; 2026 &bull; Diseñado para distribuidores de Imbabura &bull; 100% Open Source (Evolution API + OSRM + Centrifugo + Coolify)
      </footer>
    </div>
  );
}
