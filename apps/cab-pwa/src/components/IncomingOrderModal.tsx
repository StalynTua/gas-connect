import { useEffect, useState } from 'react';
import { useCabStore } from '../stores/cabStore.js';
import { cabAudioAlarm } from '../lib/audioAlarm.js';
import { AlertCircle, Clock, MapPin, Navigation, ThumbsUp, XCircle } from 'lucide-react';

export function IncomingOrderModal() {
  const { activeOffer, acceptOffer, rejectOffer } = useCabStore();
  const [secondsRemaining, setSecondsRemaining] = useState(45);

  useEffect(() => {
    if (!activeOffer) return;

    setSecondsRemaining(activeOffer.timeoutSeconds || 45);
    // Iniciar alarma acústica
    cabAudioAlarm.startAlarm();

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          cabAudioAlarm.stopAlarm();
          rejectOffer(); // Timeout automático
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      cabAudioAlarm.stopAlarm();
    };
  }, [activeOffer]);

  if (!activeOffer) return null;

  const handleAccept = () => {
    cabAudioAlarm.stopAlarm();
    acceptOffer();
  };

  const handleReject = () => {
    cabAudioAlarm.stopAlarm();
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

      {/* Cabecera de Alerta */}
      <div className="text-center mt-2">
        <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider mb-2 border border-amber-500/30">
          <Clock className="w-4 h-4 animate-spin" />
          ¡Nuevo Pedido en Ruta! ({secondsRemaining}s)
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          {activeOffer.quantity} {activeOffer.quantity === 1 ? 'CILINDRO' : 'CILINDROS'}
        </h1>
        <p className="text-2xl font-black text-emerald-400 mt-1">
          Cobro: ${activeOffer.totalPrice.toFixed(2)} (Efectivo)
        </p>
      </div>

      {/* Tarjeta de Localización y Referencia */}
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-5 my-3 shadow-2xl">
        <div className="flex items-start gap-3">
          <MapPin className="w-7 h-7 text-amber-400 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-bold text-slate-300">
              Sector: <span className="text-white font-extrabold">{activeOffer.customerSector}</span>
            </h2>
            <div className="mt-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs uppercase font-bold text-slate-500 block mb-1">
                Referencia de Fachada:
              </span>
              <p className="text-base font-bold text-amber-200 leading-snug">
                "{activeOffer.landmark}"
              </p>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-sky-400" />
                Desvío: ~{activeOffer.estimatedDetourMeters}m
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Tiempo extra: ~{activeOffer.estimatedEtaMinutes} min
              </span>
            </div>
          </div>
        </div>

        {activeOffer.hasEmptyCylinders && (
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/50">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Cliente tiene los envases vacíos listos para entregar
          </div>
        )}
      </div>

      {/* Botones táctiles gigantes (>= 64px) para dedos de trabajo */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleAccept}
          className="w-full h-20 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-2xl rounded-2xl shadow-xl shadow-emerald-900/50 flex items-center justify-center gap-3 transition-transform"
        >
          <ThumbsUp className="w-8 h-8" />
          ACEPTAR PEDIDO
        </button>

        <button
          onClick={handleReject}
          className="w-full h-14 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-lg rounded-2xl flex items-center justify-center gap-2 transition-transform"
        >
          <XCircle className="w-5 h-5 text-red-400" />
          Rechazar (Pasa a otro camión)
        </button>
      </div>
    </div>
  );
}
