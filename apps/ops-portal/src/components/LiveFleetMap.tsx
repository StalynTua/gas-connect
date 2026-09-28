import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Radio, Layers, MapPin } from 'lucide-react';

export interface TruckPin {
  id: string;
  licensePlate: string;
  driverName: string;
  helperName: string;
  helperPhone: string;
  status: 'IDLE' | 'IN_TRANSIT' | 'OFFLINE';
  currentStockFull: number;
  currentStockEmpty: number;
  lastLatitude: number;
  lastLongitude: number;
  zone: string;
}

interface LiveFleetMapProps {
  trucks: TruckPin[];
  selectedTruckId?: string | null;
  onSelectTruck: (truckId: string) => void;
}

// Coordenadas del centro de Ibarra, Ecuador
const IBARRA_CENTER: [number, number] = [0.3475, -78.1285];

export const LiveFleetMap: React.FC<LiveFleetMapProps> = ({
  trucks,
  selectedTruckId,
  onSelectTruck,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'IN_TRANSIT' | 'IDLE'>('ALL');
  const [mapStyle, setMapStyle] = useState<'DARK' | 'OSM'>('DARK');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Inicializar mapa de Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: IBARRA_CENTER,
      zoom: 14,
      zoomControl: false,
    });

    // Control de zoom en la esquina superior derecha
    L.control.zoom({ position: 'topright' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Manejar cambio de capa de mapa (CartoDB Dark vs OpenStreetMap)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      mapStyle === 'DARK'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution =
      mapStyle === 'DARK'
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    const newTileLayer = L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [mapStyle]);

  // Actualizar marcadores de camiones en el mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Filtrar camiones
    const filteredTrucks = trucks.filter((t) => {
      if (activeFilter === 'ALL') return true;
      return t.status === activeFilter;
    });

    const currentMarkerIds = new Set<string>();

    filteredTrucks.forEach((truck) => {
      currentMarkerIds.add(truck.id);
      const isSelected = selectedTruckId === truck.id;
      const isLowStock = truck.currentStockFull <= 5;

      const badgeBg = isSelected
        ? 'bg-amber-500 text-slate-950 border-white ring-4 ring-amber-400/40'
        : truck.status === 'IN_TRANSIT'
        ? 'bg-slate-900 text-emerald-400 border-emerald-500/80 shadow-emerald-500/20'
        : 'bg-slate-900 text-sky-400 border-sky-500/80 shadow-sky-500/20';

      const pingColor = truck.status === 'IN_TRANSIT' ? 'bg-emerald-500' : isLowStock ? 'bg-amber-500' : 'bg-sky-500';

      // HTML personalizado para el marcador Leaflet DivIcon
      const customHtml = `
        <div class="relative cursor-pointer transition-transform hover:scale-110">
          <div class="absolute -inset-2 rounded-full opacity-60 animate-ping pointer-events-none ${pingColor}"></div>
          <div class="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-2xl border text-xs font-bold ${badgeBg}">
            <svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1" />
            </svg>
            <span>${truck.licensePlate}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              isLowStock ? 'bg-red-500/30 text-red-200 border border-red-500/50' : 'bg-slate-800 text-white'
            }">
              ${truck.currentStockFull}📦
            </span>
          </div>
        </div>
      `;

      const divIcon = L.divIcon({
        html: customHtml,
        className: 'custom-leaflet-truck-icon',
        iconSize: [120, 36],
        iconAnchor: [60, 18],
      });

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; color: #f8fafc; padding: 4px;">
          <h3 style="margin: 0; font-size: 13px; font-weight: 700; color: #38bdf8;">${truck.licensePlate} (${truck.zone})</h3>
          <p style="margin: 4px 0 2px 0; font-size: 11px; color: #94a3b8;">Conductor: <b>${truck.driverName}</b></p>
          <p style="margin: 0 0 4px 0; font-size: 11px; color: #94a3b8;">Ayudante: <b>${truck.helperName} (${truck.helperPhone})</b></p>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 6px; padding-top: 4px; border-top: 1px solid #334155;">
            <span style="color: #34d399; font-weight: 700;">📦 ${truck.currentStockFull} Llenos</span>
            <span style="color: #94a3b8;">🔄 ${truck.currentStockEmpty} Vacíos</span>
          </div>
        </div>
      `;

      let marker = markersRef.current.get(truck.id);

      if (marker) {
        marker.setLatLng([truck.lastLatitude, truck.lastLongitude]);
        marker.setIcon(divIcon);
        marker.setPopupContent(popupContent);
      } else {
        marker = L.marker([truck.lastLatitude, truck.lastLongitude], { icon: divIcon }).addTo(map);

        marker.bindPopup(popupContent, {
          className: 'dark-leaflet-popup',
        });

        marker.on('click', () => {
          onSelectTruck(truck.id);
        });

        markersRef.current.set(truck.id, marker);
      }
    });

    // Eliminar marcadores que ya no están
    markersRef.current.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });
  }, [trucks, selectedTruckId, activeFilter, onSelectTruck]);

  // Centrar suavemente el mapa cuando se selecciona un camión
  useEffect(() => {
    if (!selectedTruckId || !mapInstanceRef.current) return;
    const selectedTruck = trucks.find((t) => t.id === selectedTruckId);
    if (selectedTruck) {
      mapInstanceRef.current.panTo([selectedTruck.lastLatitude, selectedTruck.lastLongitude], {
        animate: true,
        duration: 0.8,
      });
      const marker = markersRef.current.get(selectedTruckId);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedTruckId, trucks]);

  return (
    <div className="bg-slate-800/90 border border-slate-700/60 rounded-xl overflow-hidden shadow-xl flex flex-col h-[540px]">
      {/* Estilos CSS inline para Leaflet en tema oscuro */}
      <style>{`
        .custom-leaflet-truck-icon {
          background: transparent !important;
          border: none !important;
        }
        .dark-leaflet-popup .leaflet-popup-content-wrapper {
          background-color: #0f172a !important;
          color: #f8fafc !important;
          border: 1px solid #334155 !important;
          border-radius: 12px !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5) !important;
        }
        .dark-leaflet-popup .leaflet-popup-tip {
          background-color: #0f172a !important;
        }
      `}</style>

      {/* Barra de cabecera del mapa */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Mapa en Vivo (Ibarra, Ecuador)</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              OpenStreetMap + OSRM
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de capa cartográfica */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setMapStyle('DARK')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                mapStyle === 'DARK' ? 'bg-slate-700 text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Oscuro</span>
            </button>
            <button
              onClick={() => setMapStyle('OSM')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                mapStyle === 'OSM' ? 'bg-slate-700 text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3 h-3" />
              <span>OSM Estándar</span>
            </button>
          </div>

          {/* Filtros rápidos por estado */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeFilter === 'ALL'
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({trucks.length})
            </button>
            <button
              onClick={() => setActiveFilter('IN_TRANSIT')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeFilter === 'IN_TRANSIT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              En Ruta
            </button>
            <button
              onClick={() => setActiveFilter('IDLE')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeFilter === 'IDLE'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Disponibles
            </button>
          </div>
        </div>
      </div>

      {/* Contenedor del mapa Leaflet */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden select-none">
        <div ref={mapContainerRef} className="w-full h-full z-10" />
      </div>

      {/* Pie del mapa con leyenda */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>En Ruta</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span>Disponible</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Stock Crítico (&le;5)</span>
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Frecuencia GPS: 10s</span>
        </div>
      </div>
    </div>
  );
};
