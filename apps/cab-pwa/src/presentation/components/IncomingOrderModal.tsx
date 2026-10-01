import { useEffect, useState } from 'react';
import { useCabStore } from '../../application/cab-store.js';
import { AlertCircle, Clock, MapPin, Navigation, ThumbsUp, XCircle } from 'lucide-react';

export function IncomingOrderModal() {
  const { activeOffer, acceptOffer, rejectOffer } = useCabStore();
  const [secondsRemaining, setSecondsRemaining] = useState(45);

  useEffect(() => {
    if (!activeOffer) return;

    setSecondsRemaining(activeOffer.timeoutSeconds || 45);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          rejectOffer(); // Timeout automático controlado por la máquina de estados
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [activeOffer, rejectOffer]);

  if (!activeOffer) return null;

  const handleAccept = () => {
    acceptOffer();
  };

  const handleReject = () => {
    rejectOffer();
  };

  const progressPercent = (secondsRemaining / (activeOffer.timeoutSeconds || 45)) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-4 md:p-6 animate-pulse-slow">
      {/* Barra de progreso de tiempo */}
      <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            secondsRemaining < 15 ? 'bg-red-500' : 'bg-amber-400'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Contenido Central de Alerta */}
      <div className="my-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase mb-3">
          <Clock className="w-3.5 h-3.5 animate-spin" />
          <span>¡Pedido al Paso Detectado! (Expira en {secondsRemaining}s)</span>
        </div>

        <h2 className="text-4xl font-black text-white tracking-tight">
          {activeOffer.quantity} {activeOffer.quantity === 1 ? 'Cilindro' : 'Cilindros'} GLP
        </h2>
        <p className="text-2xl font-bold text-amber-400 mt-1">
          Cobro: ${activeOffer.totalPrice.toFixed(2)}
        </p>

        {/* Tarjeta de Localización & Desvío */}
        <div className="mt-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-left shadow-2xl">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-slate-200">{activeOffer.customerSector}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">"{activeOffer.landmark}"</p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1 text-emerald-400">
              <Navigation className="w-3.5 h-3.5" /> Desvío: ~{activeOffer.estimatedDetourMeters}m
            </span>
            <span className="text-slate-400">
              Llegada estimada: ~{activeOffer.estimatedEtaMinutes} min
            </span>
          </div>
        </div>

        {activeOffer.hasEmptyCylinders && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 py-1.5 px-3 rounded-xl border border-emerald-800/50">
            <AlertCircle className="w-4 h-4" />
            <span>Cliente tiene envase(s) vacío(s) listo para intercambio</span>
          </div>
        )}
      </div>

      {/* Botones Gigantes de Acción Táctil (>= 64px) */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          onClick={handleReject}
          className="h-20 bg-rose-950/80 border-2 border-rose-600/80 hover:bg-rose-900 active:scale-95 text-rose-200 font-black text-lg rounded-2xl flex items-center justify-center gap-2 transition-transform shadow-lg shadow-rose-950/40"
        >
          <XCircle className="w-6 h-6" />
          Rechazar
        </button>

        <button
          onClick={handleAccept}
          className="h-20 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xl rounded-2xl flex items-center justify-center gap-2 transition-transform shadow-xl shadow-emerald-950/50"
        >
          <ThumbsUp className="w-7 h-7" />
          Aceptar
        </button>
      </div>
    </div>
  );
}
