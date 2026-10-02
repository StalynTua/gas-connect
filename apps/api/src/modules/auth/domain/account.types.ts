export type AccountRole = 'TRUCK_HELPER' | 'OPS_OPERATOR' | 'CUSTOMER';

export interface AccountDomain {
  id: string;
  username: string;
  passwordHash: string;
  role: AccountRole;
  isActive: boolean;
  truckId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TruckSummary {
  id: string;
  licensePlate: string;
  helperName: string;
}

export interface AccountWithTruck {
  account: AccountDomain;
  truck?: TruckSummary | null;
}

export interface SessionDomain {
  id: string;
  token: string;
  accountId: string;
  createdAt: Date;
}
