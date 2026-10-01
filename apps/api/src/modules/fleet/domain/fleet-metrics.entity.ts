export interface FleetDashboardMetrics {
  totalTrucksActive: number;
  totalStockAvailable: number;
  completedOrdersToday: number;
  totalCollectedToday: number;
  lowStockAlertsCount: number;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'ORDER_DELIVERED' | 'OFFER_ACCEPTED' | 'STOCK_LOW' | 'ORDER_RECEIVED';
  title: string;
  description: string;
  zone: string;
}
