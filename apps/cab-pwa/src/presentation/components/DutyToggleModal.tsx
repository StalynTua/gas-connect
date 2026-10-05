import { useCabStore } from '../../application/cab-store.js';
import { X, Power, CheckCircle2, Moon, AlertCircle } from 'lucide-react';

interface DutyToggleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DutyToggleModal({ isOpen, onClose }: DutyToggleModalProps) {
  const { state, setDutyStatus } = useCabStore();

  if (!isOpen) return null;

  const isAvailable = state === 'IDLE';
  const isInTransit = state === 'IN_TRANSIT';

  const handleToggle = async () => {
    if (isInTransit) return;
    const targetStatus = isAvailable ? 'OFF_DUTY' : 'IDLE';
    await setDutyStatus(targetStatus);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="duty-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              isAvailable
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {isAvailable ? <CheckCircle2 className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </div>
          <div>
            <h2 id="duty-modal-title" className="text-lg font-black text-white">
              Disponibilidad de Turno
            </h2>
            <p className="text-xs font-semibold text-slate-400">
              Control de estado para recepción de pedidos
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 my-4 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-black tracking-wider text-slate-400 block mb-1">
              Estado actual
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isAvailable ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                }`}
              />
              <span
                className={`text-base font-black ${
                  isAvailable ? 'text-emerald-400' : 'text-slate-300'
                }`}
              >
                {isAvailable ? 'ACTIVO (Disponible)' : 'INACTIVO (Fuera de Turno)'}
              </span>
            </div>
          </div>

          {/* Switch interactivo */}
          <button
            type="button"
            role="switch"
            aria-checked={isAvailable}
            disabled={isInTransit}
            onClick={handleToggle}
            className={`w-16 h-10 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              isInTransit
                ? 'bg-slate-800 cursor-not-allowed opacity-50'
                : isAvailable
                ? 'bg-emerald-600 justify-end'
                : 'bg-slate-700 justify-start'
            }`}
          >
            <span
              className={`w-8 h-8 rounded-full bg-white shadow-md transform transition-transform flex items-center justify-center`}
            >
              <Power
                className={`w-4 h-4 ${
                  isAvailable ? 'text-emerald-600' : 'text-slate-600'
                }`}
              />
            </span>
          </button>
        </div>

        {/* Mensaje de estado explicativo */}
        {isInTransit ? (
          <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl flex items-start gap-2 text-amber-300 text-xs font-semibold mt-3">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>No puedes cambiar de estado mientras tienes un reparto en curso. Completa la entrega primero.</span>
          </div>
        ) : (
          <p className="text-xs font-medium text-slate-400 px-1 leading-relaxed">
            {isAvailable
              ? 'Tu camión está visible para el despacho, transmitiendo coordenadas en vivo y listo para recibir asignaciones automáticas.'
              : 'Tu camión está en pausa. Las ofertas de despacho y el envío de telemetría GPS se encuentran suspendidos.'}
          </p>
        )}

        {/* Botón de acción principal / cierre */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-extrabold text-sm rounded-xl transition-all"
          >
            Aceptar y Volver
          </button>
        </div>
      </div>
    </div>
  );
}
