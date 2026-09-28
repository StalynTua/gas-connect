import { useCabStore } from '../stores/cabStore.js';
import { CheckCircle2, MapPin, Navigation, Compass, AlertTriangle } from 'lucide-react';

export function ActiveDeliveryView() {
  const { activeOrder, completeDelivery, stockFull } = useCabStore();

  if (!activeOrder) return null;

  const lat = activeOrder.destination.latitude;
  const lng = activeOrder.destination.longitude;

  const openGoogleMaps = () => {
    window.location.href = `google.navigation:q=${lat},${lng}`;
    setTimeout(() => {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }, 500);
  };

  const openWaze = () => {
    window.location.href = `waze://?ll=${lat},${lng}&navigate=yes`;
    setTimeout(() => {
      window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
    }, 500);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 md:p-6 bg-slate-950">
      {/* Cabecera de Entrega */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs uppercase font-extrabold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
            En Ruta hacia el Cliente
          </span>
          <span className="text-xs font-bold text-slate-400">
            Stock actual: <strong className="text-white">{stockFull}</strong>
          </span>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-black text-white">
            Entrega: {activeOrder.quantity} {activeOrder.quantity === 1 ? 'Cilindro' : 'Cilindros'}
          </h1>
          <p className="text-3xl font-black text-emerald-400 mt-1">
            Cobrar: ${activeOrder.totalPrice.toFixed(2)} (Efectivo)
          </p>
        </div>

        {/* Tarjeta de Localización & Fachada */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-4 shadow-xl">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-6 h-6 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-slate-300">Sector: {activeOrder.customerSector}</p>
              <div className="mt-2 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
                <span className="text-xs font-bold uppercase text-amber-400 block mb-0.5">
                  Referencia de Fachada:
                </span>
                <p className="text-base font-extrabold text-amber-200">
                  "{activeOrder.landmark}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Accesos rápidos de navegación nativa (Waze / Google Maps) */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={openGoogleMaps}
            className="h-14 bg-slate-900 border border-slate-700 hover:bg-slate-800 active:scale-95 rounded-xl font-bold text-sm text-sky-400 flex items-center justify-center gap-2 transition-transform"
          >
            <Navigation className="w-5 h-5 text-sky-400" />
            Google Maps
          </button>
          <button
            onClick={openWaze}
            className="h-14 bg-slate-900 border border-slate-700 hover:bg-slate-800 active:scale-95 rounded-xl font-bold text-sm text-cyan-400 flex items-center justify-center gap-2 transition-transform"
          >
            <Compass className="w-5 h-5 text-cyan-400" />
            Abrir en Waze
          </button>
        </div>
      </div>

      {/* Alerta de Stock Crítico */}
      {stockFull - activeOrder.quantity <= 3 && (
        <div className="my-2 bg-red-950/60 border border-red-500/50 p-3 rounded-xl flex items-center gap-3 text-red-200 text-xs font-bold">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>¡Atención! Tras esta entrega te quedarán ≤ 3 cilindros. Coordina recarga con bodega.</span>
        </div>
      )}

      {/* Botón táctil gigante de confirmación de cobro */}
      <div className="mt-4">
        <button
          onClick={completeDelivery}
          className="w-full h-20 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xl rounded-2xl shadow-2xl shadow-emerald-900/40 flex items-center justify-center gap-3 transition-transform"
        >
          <CheckCircle2 className="w-8 h-8" />
          ENTREGADO Y COBRADO (${activeOrder.totalPrice.toFixed(2)})
        </button>
      </div>
    </div>
  );
}
