import { useState } from 'react';
import { Flame, RefreshCw, Radio } from 'lucide-react';
import { useFleetDashboard } from './application/useFleetDashboard.js';
import { useWhatsAppStatus } from './application/useWhatsAppStatus.js';
import { MetricsCards } from './presentation/components/MetricsCards.js';
import { LiveFleetMap } from './presentation/components/LiveFleetMap.js';
import { TrucksList } from './presentation/components/TrucksList.js';
import { ActivityLog } from './presentation/components/ActivityLog.js';
import { WhatsAppStatusCard } from './presentation/components/WhatsAppStatusCard.js';

export default function App() {
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);

  // Application Hooks (Domain data & real-time Centrifugo stream)
  const {
    trucks,
    metrics,
    events,
    loading: fleetLoading,
    isLiveConnected,
    refreshSnapshot,
  } = useFleetDashboard();

  const {
    status: waStatus,
    qrData,
    showQrModal,
    setShowQrModal,
    loading: waLoading,
    actionLoading: waActionLoading,
    notice: waNotice,
    setNotice: setWaNotice,
    fetchStatus: fetchWaStatus,
    fetchQrCode,
    handleSetup,
    handleLogout,
  } = useWhatsAppStatus();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">GasConnect Ibarra</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">
                  Ops Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">Coordinación en Tiempo Real de GLP Doméstico</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Centrifugo v5 Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs">
              <Radio
                className={`w-3.5 h-3.5 ${
                  isLiveConnected ? 'text-emerald-400 animate-pulse' : 'text-sky-400'
                }`}
              />
              <span className="text-slate-300 font-medium">
                {isLiveConnected
                  ? 'Centrifugo v5: En Vivo (Push)'
                  : 'Centrifugo v5: Conectando...'}
              </span>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={() => refreshSnapshot()}
              disabled={fleetLoading}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fleetLoading ? 'animate-spin text-sky-400' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Evolution API / WhatsApp Status & QR Scanner */}
        <WhatsAppStatusCard
          status={waStatus}
          qrData={qrData}
          showQrModal={showQrModal}
          setShowQrModal={setShowQrModal}
          loading={waLoading}
          actionLoading={waActionLoading}
          notice={waNotice}
          setNotice={setWaNotice}
          fetchStatus={fetchWaStatus}
          fetchQrCode={fetchQrCode}
          handleSetup={handleSetup}
          handleLogout={handleLogout}
        />

        {/* KPI Metrics */}
        <MetricsCards metrics={metrics} />

        {/* Fleet Grid: Map (2/3) + Truck List (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LiveFleetMap
              trucks={trucks}
              selectedTruckId={selectedTruckId}
              onSelectTruck={(id) => setSelectedTruckId(id)}
            />
          </div>
          <div className="lg:col-span-1">
            <TrucksList
              trucks={trucks}
              selectedTruckId={selectedTruckId}
              onSelectTruck={(id) => setSelectedTruckId(id)}
            />
          </div>
        </div>

        {/* Live Event Stream */}
        <ActivityLog events={events} />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        GasConnect Ibarra &copy; 2026 &bull; Diseñado para distribuidores de Imbabura &bull; 100% Open Source (Evolution API + OSRM + Centrifugo + Coolify)
      </footer>
    </div>
  );
}
