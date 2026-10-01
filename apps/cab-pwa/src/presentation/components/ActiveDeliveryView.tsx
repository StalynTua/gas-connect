import { useCabStore } from '../../application/cab-store.js';
import { CheckCircle2, MapPin, Navigation, Compass, AlertTriangle } from 'lucide-react';

export function ActiveDeliveryView() {
  const { activeOrder, completeDelivery, stockFull, setTruckStatus, licensePlate, helperName } = useCabStore();

  const handleReturnToIdle = async () => {
    await setTruckStatus('IDLE');
  };

  if (!activeOrder) {
    return (
      <div className="flex-1 flex flex-col justify-between p-4 md:p-6 bg-slate-950">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs uppercase font-extrabold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              En Ruta / En Reparto
            </span>
            <span className="text-xs font-bold text-slate-400">
              Stock actual: <strong className="text-white">{stockFull}</strong>
            </span>
          </div>

          <div className="mt-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4 animate-pulse">
              <Navigation className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-black text-white">Camión en Ruta</h1>
            <p className="text-sm font-bold text-slate-400 mt-1">Unidad: {licensePlate} • Ayudante: {helperName}</p>
            <p className="text-xs text-emerald-300/80 mt-3 max-w-xs mx-auto">
              La unidad está marcada como "En Reparto" en el mapa de operaciones y transmitiendo telemetría en tiempo real.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleReturnToIdle}
            className="w-full h-16 bg-slate-900 border border-slate-700 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition-transform shadow-lg shadow-black/40"
          >
            <span>Finalizar Ruta (Volver a Disponible)</span>
          </button>
        </div>
      </div>
    );
  }

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

        {/* Accesos Rápidos de Navegación GPS (Waze / Google Maps) */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={openGoogleMaps}
            className="h-14 bg-slate-900 border border-slate-700 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition-transform shadow-md"
          >
            <Navigation className="w-5 h-5 text-emerald-400" />
            Google Maps
          </button>

          <button
            onClick={openWaze}
            className="h-14 bg-slate-900 border border-slate-700 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition-transform shadow-md"
          >
            <Compass className="w-5 h-5 text-sky-400" />
            Waze
          </button>
        </div>

        {stockFull - activeOrder.quantity <= 3 && (
          <div className="mt-4 bg-amber-950/60 border border-amber-500/40 p-3 rounded-xl flex items-center gap-2 text-amber-300 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Atención: Al completar este pedido te quedarán solo {stockFull - activeOrder.quantity} cilindros.</span>
          </div>
        )}
      </div>

      {/* Botones de Confirmación y Cancelación */}
      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={() => completeDelivery()}
          className="w-full h-20 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xl rounded-2xl flex items-center justify-center gap-3 transition-transform shadow-2xl shadow-emerald-950/80 border-2 border-emerald-400/40"
        >
          <CheckCircle2 className="w-8 h-8" />
          <span>Marcar Entregado</span>
        </button>

        <button
          onClick={handleReturnToIdle}
          className="w-full h-11 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center transition"
        >
          Cancelar Ruta (Volver a Disponible)
        </button>
      </div>
    </div>
  );
}
