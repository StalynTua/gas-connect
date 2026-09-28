import { Phone, AlertCircle } from 'lucide-react';
import { TruckPin } from './LiveFleetMap.js';

interface TrucksListProps {
  trucks: TruckPin[];
  selectedTruckId?: string | null;
  onSelectTruck: (truckId: string) => void;
}

export const TrucksList: React.FC<TrucksListProps> = ({
  trucks,
  selectedTruckId,
  onSelectTruck,
}) => {
  return (
    <div className="bg-slate-800/90 border border-slate-700/60 rounded-xl overflow-hidden shadow-xl flex flex-col h-[520px]">
      <div className="p-4 bg-slate-900/80 border-b border-slate-700/60 flex items-center justify-between">
        <h3 className="text-base font-bold text-white">Detalle de Unidades</h3>
        <span className="text-xs bg-slate-800 text-sky-400 font-semibold px-2 py-0.5 rounded border border-slate-700">
          {trucks.length} Unidades
        </span>
      </div>

      <div className="divide-y divide-slate-700/50 overflow-y-auto flex-1 p-2 space-y-1">
        {trucks.map((truck) => {
          const isSelected = selectedTruckId === truck.id;
          const isLowStock = truck.currentStockFull <= 5;
          const maxCapacity = 40;
          const stockPercentage = Math.round((truck.currentStockFull / maxCapacity) * 100);

          return (
            <div
              key={truck.id}
              onClick={() => onSelectTruck(truck.id)}
              className={`p-3.5 rounded-lg cursor-pointer transition ${
                isSelected
                  ? 'bg-slate-700/70 border border-amber-400/50 shadow-md'
                  : 'hover:bg-slate-750 bg-slate-800/40 border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-base tracking-wide">
                      {truck.licensePlate}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        truck.status === 'IN_TRANSIT'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      }`}
                    >
                      {truck.status === 'IN_TRANSIT' ? 'En Ruta' : 'Disponible'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{truck.zone}</p>
                </div>

                {isLowStock && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Bajo Stock
                  </span>
                )}
              </div>

              {/* Barra de progreso de stock */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-300 mb-1 font-medium">
                  <span>Stock Actual:</span>
                  <span className={isLowStock ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {truck.currentStockFull} / {maxCapacity} cilindros ({stockPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${stockPercentage}%` }}
                  />
                </div>
              </div>

              {/* Conductor y Ayudante */}
              <div className="mt-3 pt-2.5 border-t border-slate-700/40 flex items-center justify-between text-xs text-slate-300">
                <div>
                  <span className="text-slate-400">Ayudante: </span>
                  <span className="font-semibold text-white">{truck.helperName}</span>
                </div>
                <a
                  href={`tel:${truck.helperPhone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 bg-sky-500/10 px-2 py-1 rounded transition"
                >
                  <Phone className="w-3 h-3" />
                  <span>Llamar</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
