import React, { useState } from 'react';
import { useAuthStore } from '../../application/auth-store.js';
import { APP_BRAND } from '../../config/app-brand.js';
import { Truck, AlertCircle, ArrowRight, Eye, EyeOff, RotateCw, Headset, Loader2, Lock } from 'lucide-react';

type DevPreviewState = 'auto' | 'normal' | 'error' | 'loading' | 'locked';

export function LoginView() {
  const {
    login,
    isLoading: storeLoading,
    error: storeError,
    isLocked: storeLocked,
    attemptsRemaining: storeAttempts,
    clearError,
    resetLockout,
  } = useAuthStore();

  const [licensePlate, setLicensePlate] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Selector para pruebas y QA en entorno de desarrollo
  const [devState, setDevState] = useState<DevPreviewState>('auto');

  // Determinar estado efectivo (modo dev override o estado real del store)
  const isDev = Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV);
  const isLoading = devState === 'loading' || (devState === 'auto' && storeLoading);
  const isLocked = devState === 'locked' || (devState === 'auto' && storeLocked);
  const hasError = devState === 'error' || (devState === 'auto' && Boolean(storeError));

  const effectiveError =
    devState === 'error'
      ? 'Contraseña incorrecta. 2 intentos restantes.'
      : storeError;

  const effectiveAttempts =
    devState === 'error'
      ? 2
      : storeAttempts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensePlate.trim() || !password || isLoading || isLocked) return;

    clearError();
    await login({
      licensePlate: licensePlate.trim().toUpperCase(),
      password,
    });
    // La sincronización de sesión y flota se orquesta reactivamente en App.tsx al autenticarse
  };

  const handlePlateChange = (val: string) => {
    setLicensePlate(val.toUpperCase());
    if (storeError) clearError();
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (storeError) clearError();
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 bg-industrial-canvas text-industrial-navy min-h-screen select-none antialiased">
      {/* Selector de estados sólo para testing y QA en modo desarrollo */}
      {isDev && (
        <nav
          aria-label="Selector de estados para pruebas de interfaz"
          className="w-full max-w-sm mx-auto mb-2 flex items-center justify-center p-1 bg-white/80 backdrop-blur-sm border border-industrial-border-card rounded-full shadow-sm text-xs font-semibold"
        >
          {(
            [
              { key: 'auto', label: 'Auto' },
              { key: 'normal', label: 'Normal' },
              { key: 'error', label: 'Error' },
              { key: 'loading', label: 'Cargando' },
              { key: 'locked', label: 'Bloqueado' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setDevState(tab.key);
                if (tab.key === 'normal') {
                  clearError();
                  resetLockout();
                }
              }}
              className={`flex-1 py-1.5 px-2 rounded-full text-center transition-all ${
                devState === tab.key
                  ? 'bg-industrial-petrol text-white shadow-sm'
                  : 'text-industrial-navy-muted hover:text-industrial-navy'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      {/* Cabecera / Identidad de Marca Industrial */}
      <header className="pt-2 sm:pt-4 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white border-[1.5px] border-industrial-border-card shadow-sm text-industrial-petrol mb-3">
          <div className="w-12 h-12 rounded-xl bg-industrial-cyan-surface flex items-center justify-center text-industrial-petrol">
            <Truck className="w-7 h-7" aria-hidden="true" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-industrial-navy font-['Plus_Jakarta_Sans',sans-serif]">
          {APP_BRAND.brandTitle}
        </h1>
        <p className="text-[11px] sm:text-xs font-bold text-industrial-navy-muted mt-1 uppercase tracking-widest">
          {APP_BRAND.brandSubtitle}
        </p>
      </header>

      {/* Tarjeta de Formulario Operativo */}
      <main className="w-full max-w-sm mx-auto my-auto">
        <div className="bg-industrial-card border-[1.5px] border-industrial-border-card rounded-card p-5 sm:p-6 shadow-sm">
          {/* Banner de bloqueo si la cuenta está inhabilitada */}
          {isLocked && (
            <div
              role="alert"
              className="mb-4 p-3.5 bg-industrial-amber-surface border-[1.5px] border-industrial-amber rounded-control flex items-start gap-2.5 text-industrial-navy text-xs font-semibold"
            >
              <Lock className="w-4 h-4 text-industrial-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <span className="block font-bold text-industrial-warning">Acceso temporalmente bloqueado</span>
                <span>Superó el límite de intentos de seguridad. Contacte a la central de despacho para desbloquear la unidad.</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo: Placa del Camión */}
            <div className="space-y-1.5">
              <label
                htmlFor="licensePlate"
                className="block text-[13px] font-semibold text-industrial-navy"
              >
                Placa del camión
              </label>
              <div className="relative flex items-center">
                <input
                  id="licensePlate"
                  type="text"
                  required
                  disabled={isLoading || isLocked}
                  autoCapitalize="characters"
                  autoComplete="username"
                  placeholder="Ej. IAA-1041"
                  value={licensePlate}
                  onChange={(e) => handlePlateChange(e.target.value)}
                  className="w-full h-14 pl-4 pr-11 bg-white border-[1.5px] border-industrial-border-input focus:border-industrial-focus focus:ring-2 focus:ring-industrial-focus/25 rounded-control text-industrial-navy font-bold text-base tracking-wider placeholder:text-industrial-navy-muted/50 uppercase transition-colors outline-none disabled:bg-industrial-canvas disabled:text-industrial-navy-muted disabled:border-industrial-border-card disabled:cursor-not-allowed"
                />
                <Truck
                  className="w-5 h-5 text-industrial-navy-muted absolute right-4 pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Campo: Contraseña de Cabina */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[13px] font-semibold text-industrial-navy"
              >
                Contraseña de cabina
              </label>
              <div className="relative flex items-center">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading || isLocked}
                  autoComplete="current-password"
                  placeholder="••••"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className={`w-full h-14 pl-4 pr-12 rounded-control text-base tracking-widest transition-colors outline-none disabled:bg-industrial-canvas disabled:text-industrial-navy-muted disabled:border-industrial-border-card disabled:cursor-not-allowed ${
                    hasError
                      ? 'bg-red-50/40 border-[1.5px] border-industrial-danger text-industrial-danger font-extrabold focus:border-industrial-danger focus:ring-2 focus:ring-industrial-danger/20'
                      : 'bg-white border-[1.5px] border-industrial-border-input text-industrial-navy font-bold focus:border-industrial-focus focus:ring-2 focus:ring-industrial-focus/25'
                  }`}
                />

                {/* Ícono de Alerta en Error o botón de mostrar/ocultar contraseña */}
                <div className="absolute right-2 flex items-center">
                  {hasError && !isLoading && !isLocked && (
                    <AlertCircle className="w-5 h-5 text-industrial-danger mr-1.5" aria-hidden="true" />
                  )}
                  <button
                    type="button"
                    disabled={isLoading || isLocked}
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 text-industrial-navy-muted hover:text-industrial-navy focus:outline-none focus:ring-2 focus:ring-industrial-focus/40 rounded-lg transition disabled:opacity-40"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Eye className="w-5 h-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mensaje de Error en línea debajo del campo */}
              {hasError && !isLocked && (
                <div
                  role="alert"
                  className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-industrial-danger animate-in fade-in"
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>
                    {effectiveError ||
                      (effectiveAttempts !== null
                        ? `Contraseña incorrecta. ${effectiveAttempts} intento(s) restante(s).`
                        : 'Contraseña incorrecta.')}
                  </span>
                </div>
              )}
            </div>

            {/* Botón de Acción Principal (CTA Ámbar Industrial) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || isLocked || !licensePlate.trim() || !password}
                className={`w-full h-14 rounded-control font-bold text-base flex items-center justify-center gap-2 transition-all ${
                  isLocked
                    ? 'bg-industrial-border-card text-industrial-navy-muted cursor-not-allowed'
                    : isLoading
                    ? 'bg-industrial-petrol text-white cursor-wait shadow-sm'
                    : hasError
                    ? 'bg-industrial-amber hover:bg-industrial-amber-hover active:bg-industrial-amber-pressed text-industrial-navy shadow-sm'
                    : 'bg-industrial-amber hover:bg-industrial-amber-hover active:bg-industrial-amber-pressed text-industrial-navy shadow-sm'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2 text-white">
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>Verificando unidad...</span>
                  </span>
                ) : isLocked ? (
                  <span className="flex items-center gap-2">
                    <Lock className="w-5 h-5" aria-hidden="true" />
                    <span>Acceso bloqueado</span>
                  </span>
                ) : hasError ? (
                  <span className="flex items-center gap-2">
                    <span>Reintentar acceso</span>
                    <RotateCw className="w-5 h-5" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>Iniciar turno</span>
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Pie de Página Operativo y Asistencia de Planta */}
      <footer className="text-center pt-4 pb-2 space-y-3">
        <p className="text-[12px] font-medium text-industrial-navy-muted">
          {APP_BRAND.helperDisclaimer}
        </p>

        <div className="space-y-2">
          <p className="text-[13px] font-semibold text-industrial-navy">
            {APP_BRAND.forgotPrompt}
          </p>

          {APP_BRAND.contactUrl ? (
            <a
              href={APP_BRAND.contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full max-w-sm mx-auto h-14 px-4 bg-white hover:bg-slate-50 border-[1.5px] border-industrial-border-card rounded-control flex items-center justify-center gap-2 text-industrial-petrol font-bold text-sm shadow-xs transition-colors"
            >
              <Headset className="w-5 h-5" aria-hidden="true" />
              <span>{APP_BRAND.contactDispatcherLabel}</span>
            </a>
          ) : (
            <div className="w-full max-w-sm mx-auto h-14 px-4 bg-white/60 border border-industrial-border-card rounded-control flex items-center justify-center gap-2 text-industrial-petrol font-bold text-sm shadow-xs">
              <Headset className="w-5 h-5" aria-hidden="true" />
              <span>{APP_BRAND.contactDispatcherLabel}</span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
