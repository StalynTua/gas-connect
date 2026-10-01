import { useEffect } from 'react';
import { useCabStore } from './stores/cabStore.js';
import { useWakeLock } from './hooks/useWakeLock.js';
import { IdleView } from './presentation/components/IdleView.js';
import { ActiveDeliveryView } from './presentation/components/ActiveDeliveryView.js';
import { IncomingOrderModal } from './presentation/components/IncomingOrderModal.js';
import { cabCentrifugoAdapter } from './infrastructure/centrifugo.adapter.js';

export function App() {
  const { state, truckId, syncWithBackend, sendTelemetry, receiveOffer, setConnectionStatus } = useCabStore();
  // Activar Screen Wake Lock para mantener encendida la pantalla en el tablero
  useWakeLock();

  useEffect(() => {
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
      }
    );

    return () => {
      clearInterval(interval);
      unsubscribeCentrifugo();
    };
  }, [truckId]);

  return (
    <div className="w-full h-screen max-w-md mx-auto flex flex-col bg-slate-950 font-sans shadow-2xl relative overflow-hidden">
      {state === 'IN_TRANSIT' ? <ActiveDeliveryView /> : <IdleView />}
      {state === 'OFFERED' && <IncomingOrderModal />}
    </div>
  );
}

export default App;

