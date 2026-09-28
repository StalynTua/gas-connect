import { useEffect, useState, useRef } from 'react';

/**
 * Hook para mantener la pantalla del teléfono del ayudante encendida
 * durante toda su jornada de reparto (Screen Wake Lock API).
 */
export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        setIsLocked(true);

        sentinel.addEventListener('release', () => {
          setIsLocked(false);
          wakeLockRef.current = null;
        });
      } catch (err) {
        console.warn('Wake Lock no disponible o denegado:', err);
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
        console.error('Error al liberar Wake Lock:', err);
      }
    }
  };

  useEffect(() => {
    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLocked) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, []);

  return { isLocked, requestWakeLock, releaseWakeLock };
}
