import React, { useState } from 'react';
import { useAuthStore } from '../../application/auth-store.js';
import { useCabStore } from '../../application/cab-store.js';
import { Truck, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export function LoginView() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const { setTruckInfo, syncWithBackend } = useCabStore();

  const [licensePlate, setLicensePlate] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensePlate.trim() || !password || isLoading) return;

    clearError();
    const success = await login({
      licensePlate: licensePlate.trim().toUpperCase(),
      password,
    });

    if (success) {
      const activeSession = useAuthStore.getState().session;
      if (activeSession) {
        setTruckInfo({
          truckId: activeSession.truckId,
          licensePlate: activeSession.licensePlate,
          helperName: activeSession.helperName,
          stock: 40,
        });
        syncWithBackend();
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-slate-950 text-white min-h-screen">
      {/* Cabecera / Identidad */}
      <div className="pt-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-4 shadow-lg shadow-sky-950/40">
          <Truck className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">GasConnect Cabina</h1>
        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
          Ibarra • Acceso de Unidad
        </p>
      </div>

      {/* Formulario de Inicio de Sesión */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-4 my-auto">
        {error && (
          <div
            role="alert"
            className="p-3.5 bg-red-950/80 border border-red-500/50 rounded-2xl flex items-start gap-3 text-red-200 text-xs font-bold shadow-lg animate-in fade-in"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="block font-black text-red-300">Error de autenticación</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Campo Placa */}
        <div className="space-y-1.5">
          <label htmlFor="licensePlate" className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            Placa del Camión
          </label>
          <div className="relative flex items-center">
            <input
              id="licensePlate"
              type="text"
              required
              disabled={isLoading}
              autoCapitalize="characters"
              autoComplete="username"
              placeholder="Ej. IAA-1041"
              value={licensePlate}
              onChange={(e) => {
                setLicensePlate(e.target.value.toUpperCase());
                if (error) clearError();
              }}
              className="w-full h-14 pl-4 pr-11 bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl text-white font-extrabold text-base tracking-wider placeholder:text-slate-600 transition outline-none uppercase"
            />
            <Truck className="w-5 h-5 text-slate-500 absolute right-4 pointer-events-none" />
          </div>
        </div>

        {/* Campo Contraseña */}
        <div className="space-y-1.5">
          <label htmlFor="password" aria-label="Contraseña" className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            Contraseña
          </label>
          <div className="relative flex items-center">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              disabled={isLoading}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) clearError();
              }}
              className="w-full h-14 pl-4 pr-12 bg-slate-900 border border-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-2xl text-white font-extrabold text-base tracking-wider placeholder:text-slate-600 transition outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 p-1.5 text-slate-500 hover:text-slate-300 focus:outline-none transition"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Botón de Ingreso */}
        <button
          type="submit"
          disabled={isLoading || !licensePlate.trim() || !password}
          className="w-full h-14 bg-sky-600 hover:bg-sky-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-black text-base rounded-2xl flex items-center justify-center gap-2 transition-transform shadow-xl shadow-sky-950/50 border border-sky-400/40 mt-2"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verificando...</span>
            </span>
          ) : (
            <>
              <span>Iniciar Turno en Cabina</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      {/* Pie de página con ayuda */}
      <div className="text-center pb-2">
        <p className="text-[11px] font-semibold text-slate-500">
          Uso exclusivo para ayudantes de distribución de gas.
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">
          Si olvidó su clave o cambió de camión, contacte al despachador de planta.
        </p>
      </div>
    </div>
  );
}
