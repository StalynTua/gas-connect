export interface AuthSession {
  token: string;
  truckId: string;
  licensePlate: string;
  helperName: string;
}

export interface LoginCredentials {
  licensePlate: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  truckId?: string;
  licensePlate?: string;
  helperName?: string;
  error?: string;
  message?: string;
  attemptsRemaining?: number;
  lockedUntil?: string;
  isLocked?: boolean;
  statusCode?: number;
}
