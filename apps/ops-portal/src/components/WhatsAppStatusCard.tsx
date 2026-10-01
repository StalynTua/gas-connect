import { WhatsAppStatusCard as PresentationWhatsAppStatusCard } from '../presentation/components/WhatsAppStatusCard.js';
import { useWhatsAppStatus } from '../application/useWhatsAppStatus.js';
export type { WhatsAppStatus, QrData } from '../domain/fleet-dashboard.types.js';

export function WhatsAppStatusCard() {
  const wa = useWhatsAppStatus();
  return (
    <PresentationWhatsAppStatusCard
      status={wa.status}
      qrData={wa.qrData}
      showQrModal={wa.showQrModal}
      setShowQrModal={wa.setShowQrModal}
      loading={wa.loading}
      actionLoading={wa.actionLoading}
      notice={wa.notice}
      setNotice={wa.setNotice}
      fetchStatus={wa.fetchStatus}
      fetchQrCode={wa.fetchQrCode}
      handleSetup={wa.handleSetup}
      handleLogout={wa.handleLogout}
    />
  );
}
