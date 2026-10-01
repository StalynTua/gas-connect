import type { TruckPin } from '../../domain/fleet-dashboard.types.js';
import { Phone, AlertCircle } from 'lucide-react';

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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      truck.status === 'IN_TRANSIT'
                        ? 'bg-emerald-400 animate-pulse'
                        : truck.status === 'IDLE'
                        ? 'bg-sky-400'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="font-extrabold text-white text-sm tracking-wide">
                    {truck.licensePlate}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    truck.status === 'IN_TRANSIT'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                      : truck.status === 'IDLE'
                      ? 'bg-sky-950/80 text-sky-300 border-sky-700/60'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {truck.status === 'IN_TRANSIT'
                    ? 'En Reparto'
                    : truck.status === 'IDLE'
                    ? 'Disponible'
                    : 'Fuera de Servicio'}
                </span>
              </div>

              <div className="mt-2 text-xs text-slate-300 space-y-0.5">
                <p>
                  <strong className="text-slate-400">Chofer:</strong> {truck.driverName}
                </p>
                <div className="flex items-center justify-between">
                  <p>
                    <strong className="text-slate-400">Ayudante:</strong> {truck.helperName}
                  </p>
                  {truck.helperPhone && (
                    <a
                      href={`tel:${truck.helperPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1 text-[11px]"
                    >
                      <Phone className="w-3 h-3" />
                      Llamar
                    </a>
                  )}
                </div>
                <p className="text-slate-400 text-[11px] truncate">
                  <strong className="text-slate-500">Zona:</strong> {truck.zone}
                </p>
              </div>

              {/* Barra de Progreso de Stock */}
              <div className="mt-3">
                <div className="flex justify-between text-[11px] font-medium mb-1">
                  <span className={isLowStock ? 'text-red-400 font-bold flex items-center gap-1' : 'text-slate-300'}>
                    {isLowStock && <AlertCircle className="w-3 h-3" />}
                    Stock: {truck.currentStockFull} / {maxCapacity}
                  </span>
                  <span className="text-slate-400">{stockPercentage}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isLowStock ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
