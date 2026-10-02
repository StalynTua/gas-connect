import { useEffect } from 'react';
import { useCabStore } from './stores/cabStore.js';
import { useAuthStore } from './application/auth-store.js';
import { useWakeLock } from './hooks/useWakeLock.js';
import { IdleView } from './presentation/components/IdleView.js';
import { ActiveDeliveryView } from './presentation/components/ActiveDeliveryView.js';
import { IncomingOrderModal } from './presentation/components/IncomingOrderModal.js';
import { LoginView } from './presentation/components/LoginView.js';
import { cabCentrifugoAdapter } from './infrastructure/centrifugo.adapter.js';

export function App() {
  const { isAuthenticated, session } = useAuthStore();
  const { state, truckId, setTruckInfo, syncWithBackend, sendTelemetry, receiveOffer, setConnectionStatus } = useCabStore();

  // Activar Screen Wake Lock para mantener encendida la pantalla en el tablero
  useWakeLock();

  // Sincronizar truckId del store con la sesión si difieren
  useEffect(() => {
    if (session && session.truckId && session.truckId !== truckId) {
      setTruckInfo({
        truckId: session.truckId,
        licensePlate: session.licensePlate,
        helperName: session.helperName,
        stock: 40,
      });
    }
  }, [session, truckId, setTruckInfo]);

  useEffect(() => {
    if (!isAuthenticated || !truckId) {
      return;
    }

    // Sincronizar estado inicial con BD
    syncWithBackend();

    // Enviar telemetría periódica cada 15 segundos a la BD
    const interval = setInterval(() => {
      sendTelemetry();
    }, 15000);

    // Suscripción en tiempo real a Centrifugo para ofertas de despacho entrantes
    const unsubscribeCentrifugo = cabCentrifugoAdapter.connect(
      truckId,
      (offer) => {
        receiveOffer(offer);
      },
      (connected) => {
        setConnectionStatus(connected);
      },
      session?.token || ''
    );

    return () => {
      clearInterval(interval);
      unsubscribeCentrifugo();
    };
  }, [isAuthenticated, truckId, session?.token]);

  if (!isAuthenticated) {
    return (
      <div className="w-full h-screen max-w-md mx-auto flex flex-col bg-slate-950 font-sans shadow-2xl relative overflow-hidden">
        <LoginView />
      </div>
    );
  }

  return (
    <div className="w-full h-screen max-w-md mx-auto flex flex-col bg-slate-950 font-sans shadow-2xl relative overflow-hidden">
      {state === 'IN_TRANSIT' ? <ActiveDeliveryView /> : <IdleView />}
      {state === 'OFFERED' && <IncomingOrderModal />}
    </div>
  );
}

export default App;


