import { Truck, PackageCheck, AlertTriangle, DollarSign } from 'lucide-react';

interface MetricsProps {
  metrics: {
    totalTrucksActive: number;
    totalStockAvailable: number;
    completedOrdersToday: number;
    totalCollectedToday: number;
    lowStockAlertsCount: number;
  };
}

export const MetricsCards: React.FC<MetricsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Camiones en Ruta */}
      <div className="bg-slate-800/90 border border-slate-700/60 rounded-xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Flota Activa</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-white">{metrics.totalTrucksActive}</span>
            <span className="text-xs text-emerald-400 font-medium">Camiones en Ibarra</span>
          </div>
        </div>
        <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
          <Truck className="w-6 h-6" />
        </div>
      </div>

      {/* Stock Total en Calle */}
      <div className="bg-slate-800/90 border border-slate-700/60 rounded-xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">GLP Disponible</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-white">{metrics.totalStockAvailable}</span>
            <span className="text-xs text-sky-400 font-medium">Cilindros 15kg</span>
          </div>
        </div>
        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
          <PackageCheck className="w-6 h-6" />
        </div>
      </div>

      {/* Entregas y Recaudación */}
      <div className="bg-slate-800/90 border border-slate-700/60 rounded-xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Entregas de Hoy</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-white">{metrics.completedOrdersToday}</span>
            <span className="text-xs text-emerald-400 font-semibold">${metrics.totalCollectedToday.toFixed(2)}</span>
          </div>
        </div>
        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
          <DollarSign className="w-6 h-6" />
        </div>
      </div>

      {/* Alertas de Stock Crítico */}
      <div className="bg-slate-800/90 border border-slate-700/60 rounded-xl p-4 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Stock Crítico (&le;5)</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-3xl font-extrabold ${metrics.lowStockAlertsCount > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
              {metrics.lowStockAlertsCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {metrics.lowStockAlertsCount > 0 ? 'Requieren recarga' : 'Nivel óptimo'}
            </span>
          </div>
        </div>
        <div className={`p-3 rounded-xl border ${metrics.lowStockAlertsCount > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-700/30 text-slate-500 border-slate-700'}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
