import { useCabStore, ActiveOffer } from '../../application/cab-store.js';
import { useAuthStore } from '../../application/auth-store.js';
import { cabApiClient } from '../../infrastructure/cab-api.client.js';
import { Truck, Wifi, ShieldAlert, Sparkles, Navigation, LogOut } from 'lucide-react';

export function IdleView() {
  const { licensePlate, helperName, stockFull, isConnected, isDBSynced, receiveOffer, setTruckStatus } = useCabStore();
  const { logout } = useAuthStore();

  const handleSimulateIncomingOrder = async () => {
    // 1. Intentar crear orden simulada real en el backend para generar sesión de despacho válida
    const realOffer = await cabApiClient.simulateOrder();
    if (realOffer) {
      receiveOffer(realOffer);
      return;
    }

    // Fallback si la API no está disponible
    const mockOffer: ActiveOffer = {
      dispatchAttemptId: `attempt-${Date.now()}`,
      orderId: `ord-${Date.now()}`,
      timeoutSeconds: 45,
      cylinderType: 'DOMESTIC_15KG',
      quantity: 2,
      totalPrice: 6.0,
      hasEmptyCylinders: true,
      customerSector: 'Los Ceibos (Calle Los Sauces)',
      landmark: 'Casa esquinera amarilla de 2 pisos, reja negra con flores',
      estimatedDetourMeters: 280,
      estimatedEtaMinutes: 2.5,
      destination: {
        latitude: 0.3475,
        longitude: -78.1285,
      },
    };
    receiveOffer(mockOffer);
  };

  const handleSetInTransit = async () => {
    await setTruckStatus('IN_TRANSIT');
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 md:p-6 bg-slate-950">
      {/* Estado del Vehículo */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs uppercase font-extrabold text-emerald-400">Disponible</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <span
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                isDBSynced ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {isDBSynced ? 'BD Conectada' : 'Modo Offline'}
            </span>
            <div className="flex items-center gap-1 text-slate-400">
              <Wifi className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`} />
              {isConnected ? '4G' : 'Sin Red'}
            </div>
            <button
              onClick={() => {
                if (window.confirm('¿Desea cerrar sesión y finalizar el turno de este camión?')) {
                  logout();
                }
              }}
              title="Cerrar turno / Salir"
              className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
              aria-label="Cerrar turno"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-3">
            <Truck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white">Camión: {licensePlate}</h1>
          <p className="text-sm font-bold text-slate-400">Ayudante en cabina: {helperName}</p>
        </div>

        {/* Tarjeta de Stock Disponible */}
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-xl">
          <span className="text-xs uppercase font-black tracking-widest text-slate-400">
            Cilindros Llenos Disponibles
          </span>
          <div className="text-6xl font-black text-white my-2 tracking-tight">
            {stockFull}
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Listo para recibir despachos oportunos al paso
          </p>
        </div>

        {stockFull <= 3 && (
          <div className="mt-3 bg-red-950/60 border border-red-500/40 p-3 rounded-2xl flex items-center gap-2.5 text-red-300 text-xs font-bold">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>Stock crítico ({stockFull} restantes). Comunícate con bodega para reabastecimiento.</span>
          </div>
        )}
      </div>

      {/* Botones de Acción para Pruebas de Campo */}
      <div className="mt-4 flex flex-col gap-2.5">
        <button
          onClick={handleSetInTransit}
          className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition-transform shadow-lg shadow-emerald-950/30 border border-emerald-400/40"
        >
          <Navigation className="w-5 h-5" />
          Poner Camión En Ruta (Reparto en Vivo)
        </button>

        <button
          onClick={handleSimulateIncomingOrder}
          className="w-full h-14 bg-slate-900 border border-amber-500/40 hover:bg-slate-800 active:scale-95 text-amber-300 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition-transform shadow-lg shadow-amber-950/20"
        >
          <Sparkles className="w-5 h-5 text-amber-400" />
          Simular Pedido Entrante en Los Ceibos
        </button>
      </div>
    </div>
  );
}
