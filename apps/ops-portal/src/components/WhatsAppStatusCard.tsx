import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, QrCode, RefreshCw, LogOut, Settings, Phone, KeyRound } from 'lucide-react';

export interface WhatsAppStatus {
  instanceName: string;
  baseUrl: string;
  state: 'open' | 'connecting' | 'close' | 'disconnected' | string;
  connected: boolean;
}

export interface QrData {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

export function WhatsAppStatusCard() {
  const [status, setStatus] = useState<WhatsAppStatus | null>({
    instanceName: 'gasconnect-ibarra-pilot',
    baseUrl: 'http://localhost:8080',
    state: 'open',
    connected: true,
  });
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Usar estado por defecto si falla la llamada
    } finally {
      setLoading(false);
    }
  }, []);

  const qrPollAttemptsRef = useRef(0);

  const fetchQrCode = useCallback(async (phone?: string) => {
    setActionLoading(true);
    setNotice(null);
    try {
      const query = phone ? `?number=${encodeURIComponent(phone)}` : '';
      const res = await fetch(`/api/v1/whatsapp/qr${query}`);

      if (res.status === 200) {
        // QR listo — resetear contador y mostrar
        qrPollAttemptsRef.current = 0;
        const data = await res.json();
        setQrData(data);
        setShowQrModal(true);
      } else if (res.status === 202) {
        // Aún generando — mantener el modal abierto con spinner
        setShowQrModal(true);
      } else if (res.status === 409) {
        // Ya conectado
        setNotice('WhatsApp ya está conectado. No se requiere escanear QR.');
        setShowQrModal(false);
      } else {
        setNotice('No se pudo obtener el QR. Verifica que Evolution API esté activo.');
      }
    } catch {
      setNotice('Error de conexión al obtener el código QR.');
    } finally {
      setActionLoading(false);
    }
  }, []);

  const handleSetup = async () => {
    setActionLoading(true);
    setNotice(null);
    try {
      const res = await fetch('/api/v1/whatsapp/setup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setNotice('✅ Evolution API e Instancia reconfigurados correctamente.');
        await fetchStatus();
        await fetchQrCode();
      } else {
        setNotice(`⚠️ Error: ${data.message || 'Falló la configuración'}`);
      }
    } catch {
      setNotice('❌ Error al comunicarse con la API de Fastify.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('¿Seguro que deseas desconectar la sesión de WhatsApp Business?')) return;
    setActionLoading(true);
    setNotice(null);
    try {
      const res = await fetch('/api/v1/whatsapp/logout', { method: 'POST' });
      if (res.ok) {
        setNotice('Sesión de WhatsApp desconectada.');
        setShowQrModal(false);
        setQrData(null);
        await fetchStatus();
      }
    } catch {
      setNotice('Error al cerrar sesión.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    let cleanPhone = phoneInput.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '593' + cleanPhone.substring(1);
    }
    await fetchQrCode(cleanPhone);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Auto-polling cuando el modal QR está abierto y aún no hay imagen Base64.
  // Se detiene tras 15 intentos (~60 s) para evitar loops infinitos.
  useEffect(() => {
    if (!showQrModal || qrData?.base64) {
      qrPollAttemptsRef.current = 0;
      return;
    }
    const MAX_ATTEMPTS = 15;
    const qrInterval = setInterval(() => {
      qrPollAttemptsRef.current += 1;
      if (qrPollAttemptsRef.current >= MAX_ATTEMPTS) {
        clearInterval(qrInterval);
        qrPollAttemptsRef.current = 0;
        setNotice('⚠️ No se pudo obtener el QR después de 60 segundos. Usa "Re-inicializar Instancia" o revisa Evolution API.');
        return;
      }
      fetchQrCode();
    }, 4000);
    return () => clearInterval(qrInterval);
  }, [showQrModal, qrData?.base64, fetchQrCode]);

  const isConnected = status?.connected || status?.state === 'open';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* State summary */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">WhatsApp Gateway (Evolution API)</h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                  isConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
                  }`}
                />
                {isConnected ? '🟢 Conectado' : '🟡 Desconectado / QR Requerido'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Instancia: <code className="text-slate-300 font-mono">{status?.instanceName || 'gasconnect-ibarra-pilot'}</code> &bull; Webhook Active: <span className="text-emerald-400 font-medium">/api/v1/whatsapp/webhook</span>
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchQrCode()}
            disabled={actionLoading}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-sm disabled:opacity-50"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Escanear / Ver QR</span>
          </button>

          <button
            onClick={handleSetup}
            disabled={actionLoading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 transition disabled:opacity-50"
            title="Auto-configurar Webhook e Instancia"
          >
            <Settings className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Configurar Webhook</span>
          </button>

          {isConnected && (
            <button
              onClick={handleLogout}
              disabled={actionLoading}
              className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-rose-950/80 text-rose-300 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-rose-900/40 transition disabled:opacity-50"
              title="Desconectar WhatsApp"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {notice && (
        <div className="mt-3 p-2.5 bg-slate-850 rounded-lg border border-slate-750 text-xs text-slate-300 flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-slate-500 hover:text-slate-300 font-bold ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Modal QR Code */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-base">Vincular WhatsApp Business</h3>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg px-2"
              >
                &times;
              </button>
            </div>

            {/* QR Image Display */}
            <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center min-h-[220px] relative shadow-inner">
              {qrData?.base64 ? (
                <img src={qrData.base64} alt="Evolution API WhatsApp QR Code" className="w-56 h-56 object-contain" />
              ) : (
                <div className="text-center text-slate-800 space-y-3 py-4">
                  <RefreshCw className="w-12 h-12 mx-auto text-emerald-600 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900">Generando código QR en Evolution API...</p>
                    <p className="text-[11px] text-slate-500">Iniciando socket Baileys. Esto tomará entre 3 y 8 segundos.</p>
                  </div>
                  <button
                    onClick={handleSetup}
                    className="text-[11px] bg-slate-900 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
                  >
                    ⚡ Re-inicializar Instancia
                  </button>
                </div>
              )}
            </div>

            {/* Alternative Pairing Code by Phone */}
            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>¿Prefieres Vincular por Código de Texto?</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ingresa el número de WhatsApp de la distribuidora para recibir un código numérico de 8 dígitos:
              </p>
              <form onSubmit={handleRequestPairingCode} className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="0991234567"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full bg-slate-900 text-slate-100 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading || !phoneInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  Obtener Código
                </button>
              </form>

              {qrData?.pairingCode && (
                <div className="mt-2 bg-slate-900 p-2.5 rounded-lg text-center border border-emerald-500/40">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Código de Emparejamiento</span>
                  <span className="text-xl font-mono font-black text-emerald-400 tracking-wider">{qrData.pairingCode}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => fetchQrCode()}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                <span>Refrescar QR</span>
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-1.5 rounded-lg font-semibold border border-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
