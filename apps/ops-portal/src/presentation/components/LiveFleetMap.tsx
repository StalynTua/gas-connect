import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Radio, Layers } from 'lucide-react';
import type { TruckPin } from '../../domain/fleet-dashboard.types.js';

export type { TruckPin };

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

  // Inicialización del Mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: IBARRA_CENTER,
      zoom: 14,
      zoomControl: true,
    });

    const tileUrl =
      mapStyle === 'DARK'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    tileLayerRef.current = tiles;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Cambio de Estilo de Capa
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    const tileUrl =
      mapStyle === 'DARK'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newTiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTiles;
  }, [mapStyle]);

  // Actualización Reactiva de Marcadores
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const filteredTrucks = trucks.filter((t) => {
      if (activeFilter === 'ALL') return true;
      return t.status === activeFilter;
    });

    const currentTruckIds = new Set(filteredTrucks.map((t) => t.id));

    // Eliminar marcadores que ya no están
    markersRef.current.forEach((marker, id) => {
      if (!currentTruckIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Añadir o actualizar marcadores
    filteredTrucks.forEach((truck) => {
      const isSelected = selectedTruckId === truck.id;
      const isLowStock = truck.currentStockFull <= 5;
      const statusColor =
        truck.status === 'IN_TRANSIT'
          ? '#10b981' // Verde esmeralda
          : truck.status === 'IDLE'
          ? '#38bdf8' // Azul cielo
          : '#94a3b8'; // Gris

      const htmlContent = `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: ${statusColor};
            opacity: ${isSelected ? 0.4 : 0.2};
            animation: ${truck.status === 'IN_TRANSIT' ? 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none'};
          "></div>
          <div style="
            position: relative;
            background: #0f172a;
            border: 2px solid ${statusColor};
            border-radius: 12px;
            padding: 4px 6px;
            color: #fff;
            font-size: 11px;
            font-weight: 800;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
            transition: transform 0.2s ease;
          ">
            <span style="line-height: 1;">${truck.licensePlate.split('-')[1] || truck.licensePlate}</span>
            <span style="font-size: 9px; color: ${isLowStock ? '#ef4444' : '#38bdf8'}; font-weight: 700; line-height: 1.1;">
              ${truck.currentStockFull}📦
            </span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: htmlContent,
        className: 'custom-truck-pin',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22],
      });

      let marker = markersRef.current.get(truck.id);

      if (marker) {
        marker.setLatLng([truck.lastLatitude, truck.lastLongitude]);
        marker.setIcon(customIcon);
      } else {
        marker = L.marker([truck.lastLatitude, truck.lastLongitude], { icon: customIcon }).addTo(map);
        marker.on('click', () => onSelectTruck(truck.id));
        markersRef.current.set(truck.id, marker);
      }

      // Popup informativo
      marker.bindPopup(`
        <div style="font-family: inherit; padding: 4px; color: #0f172a; min-width: 170px;">
          <h4 style="margin: 0 0 4px; font-weight: 800; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            🚚 Camión ${truck.licensePlate}
          </h4>
          <p style="margin: 2px 0; font-size: 11px;"><strong>Chofer:</strong> ${truck.driverName}</p>
          <p style="margin: 2px 0; font-size: 11px;"><strong>Ayudante:</strong> ${truck.helperName}</p>
          <p style="margin: 2px 0; font-size: 11px;"><strong>Sector:</strong> ${truck.zone}</p>
          <div style="margin-top: 6px; padding: 4px; background: #f1f5f9; border-radius: 6px; font-size: 11px; display: flex; justify-content: space-between;">
            <span>Stock lleno: <strong style="color: #059669;">${truck.currentStockFull}</strong></span>
            <span>Vacíos: <strong>${truck.currentStockEmpty}</strong></span>
          </div>
        </div>
      `);
    });

    // Centrar en camión seleccionado
    if (selectedTruckId) {
      const selected = trucks.find((t) => t.id === selectedTruckId);
      if (selected && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([selected.lastLatitude, selected.lastLongitude], 15, {
          duration: 1.2,
        });
      }
    }
  }, [trucks, activeFilter, selectedTruckId, onSelectTruck]);

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl">
      {/* Contenedor del Mapa */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Controles Flotantes Superiores */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <div className="bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-xl p-1 flex gap-1 shadow-lg">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Todos ({trucks.length})
          </button>
          <button
            onClick={() => setActiveFilter('IN_TRANSIT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeFilter === 'IN_TRANSIT'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            En Ruta
          </button>
          <button
            onClick={() => setActiveFilter('IDLE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeFilter === 'IDLE'
                ? 'bg-sky-500 text-slate-950 shadow'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            Disponibles
          </button>
        </div>
      </div>

      {/* Selector de Estilo de Mapa */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setMapStyle((prev) => (prev === 'DARK' ? 'OSM' : 'DARK'))}
          className="bg-slate-900/90 backdrop-blur border border-slate-700/80 text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition"
        >
          <Layers className="w-4 h-4 text-sky-400" />
          {mapStyle === 'DARK' ? 'Mapa Claro' : 'Mapa Oscuro'}
        </button>
      </div>

      {/* Indicador de Estado GPS en Vivo */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg">
        <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
        <span className="text-slate-300 font-medium">Ibarra en Vivo (Rastreo 15s)</span>
      </div>
    </div>
  );
};
