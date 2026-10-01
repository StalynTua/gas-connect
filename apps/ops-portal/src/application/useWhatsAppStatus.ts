import { useState, useEffect, useCallback, useRef } from 'react';
import type { WhatsAppStatus, QrData } from '../domain/fleet-dashboard.types.js';
import { whatsappApiClient } from '../infrastructure/whatsapp-api.client.js';

export function useWhatsAppStatus() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const qrPollAttemptsRef = useRef(0);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await whatsappApiClient.getStatus();
      if (data) setStatus(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQrCode = useCallback(async (phone?: string) => {
    setActionLoading(true);
    setNotice(null);
    try {
      const result = await whatsappApiClient.getQrCode(phone);
      if (result.status === 200 && result.data) {
        qrPollAttemptsRef.current = 0;
        setQrData(result.data);
        setShowQrModal(true);
      } else if (result.status === 202) {
        setShowQrModal(true);
      } else if (result.status === 409) {
        setNotice('La instancia ya está conectada. No requiere escanear QR.');
        await fetchStatus();
      } else {
        setNotice(result.message || 'Error al obtener código QR');
      }
    } finally {
      setActionLoading(false);
    }
  }, [fetchStatus]);

  const handleSetup = useCallback(async () => {
    setActionLoading(true);
    setNotice(null);
    try {
      const res = await whatsappApiClient.triggerSetup();
      setNotice(res.message);
      await fetchStatus();
    } finally {
      setActionLoading(false);
    }
  }, [fetchStatus]);

  const handleLogout = useCallback(async () => {
    if (!window.confirm('¿Seguro que deseas desvincular la sesión de WhatsApp?')) return;
    setActionLoading(true);
    try {
      const res = await whatsappApiClient.logout();
      if (res.success) {
        setNotice('Sesión cerrada correctamente');
        setStatus((prev) => (prev ? { ...prev, state: 'close', connected: false } : null));
      }
    } finally {
      setActionLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    qrData,
    showQrModal,
    setShowQrModal,
    loading,
    actionLoading,
    notice,
    setNotice,
    fetchStatus,
    fetchQrCode,
    handleSetup,
    handleLogout,
  };
}
