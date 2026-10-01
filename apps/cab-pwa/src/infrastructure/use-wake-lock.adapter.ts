import { useEffect, useState, useRef } from 'react';

/**
 * Adaptador de Infraestructura para Screen Wake Lock API.
 * Mantiene la pantalla encendida durante el turno de despacho.
 */
export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        setIsLocked(true);

        sentinel.addEventListener('release', () => {
          setIsLocked(false);
          wakeLockRef.current = null;
        });
      } catch (err) {
        console.warn('[WakeLockAdapter] Wake Lock no disponible o denegado:', err);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsLocked(false);
      } catch (err) {
        console.error('[WakeLockAdapter] Error al liberar Wake Lock:', err);
      }
    }
  };

  useEffect(() => {
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && !isLocked) {
        requestWakeLock();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      releaseWakeLock();
    };
  }, []);

  return { isLocked, requestWakeLock, releaseWakeLock };
}
