import React from 'react';
import { MessageSquare, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ActivityEvent } from '../../domain/fleet-dashboard.types.js';

export interface ActivityLogProps {
  events: ActivityEvent[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ events }) => {
  return (
    <div className="bg-slate-800/90 border border-slate-700/60 rounded-xl overflow-hidden shadow-xl mt-6">
      <div className="p-4 bg-slate-900/80 border-b border-slate-700/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <h3 className="text-base font-bold text-white">Registro de Actividad en Vivo</h3>
        </div>
        <span className="text-xs text-slate-400">Canal: fleet:ops (Centrifugo v5)</span>
      </div>

      <div className="divide-y divide-slate-700/50 max-h-64 overflow-y-auto">
        {events.map((evt) => {
          return (
            <div key={evt.id} className="p-3.5 flex items-start gap-3 hover:bg-slate-750 transition text-xs">
              <div className="mt-0.5">
                {evt.type === 'ORDER_DELIVERED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : evt.type === 'OFFER_ACCEPTED' ? (
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                ) : evt.type === 'STOCK_LOW' ? (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                ) : (
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{evt.title}</span>
                  <span className="text-[11px] text-slate-500 font-mono">{evt.timestamp}</span>
                </div>
                <p className="text-slate-400 mt-0.5">{evt.description}</p>
              </div>

              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700 font-medium">
                {evt.zone}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
