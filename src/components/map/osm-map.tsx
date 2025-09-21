"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMap, Marker, Popup, CircleMarker, Polyline } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import { Badge } from "@/components/ui/badge";

// Ensure Leaflet CSS is loaded (required for map tiles/controls)
import "leaflet/dist/leaflet.css";

// Avoid missing default marker icons by using simple CircleMarkers and DivIcons
const busDivIcon = (label: string) =>
  L.divIcon({
    html: `<div style="display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:12px;background:#111827;color:white;font-size:12px;line-height:1;box-shadow:0 1px 2px rgba(0,0,0,.25)">🚌 <span>${label}</span></div>`,
    className: "",
    iconSize: [40, 20],
    iconAnchor: [20, 10],
  });

export type MapStop = {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
};

export type MapBus = {
  id: string;
  code: string;
  lat: number;
  lng: number;
  etaMins?: number;
};

export type PolylinePath = {
  id: string;
  points: { lat: number; lng: number }[];
  color?: string;
};

function FlyTo({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom() < 12 ? 13 : map.getZoom(), { duration: 0.8 });
  }, [center, map]);
  return null;
}

// Client-side geocode via Nominatim for stops missing coordinates
async function geocode(name: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    name + ", Tamil Nadu, India"
  )}&limit=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!data?.[0]) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } as const;
}

export function OSMMap({
  center,
  stops,
  currentLoc,
  buses: incomingBuses,
  polylines,
}: {
  center: { lat: number; lng: number };
  stops: MapStop[];
  currentLoc?: { lat: number; lng: number } | null;
  buses?: MapBus[];
  polylines?: PolylinePath[];
}) {
  const [resolvedStops, setResolvedStops] = useState<MapStop[]>(stops);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const updated = await Promise.all(
        stops.map(async (s) => {
          if (s.lat != null && s.lng != null) return s;
          const r = await geocode(s.name).catch(() => null);
          if (!r) return s;
          return { ...s, lat: r.lat, lng: r.lng };
        })
      );
      if (!cancelled) setResolvedStops(updated);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [stops]);

  // Keep internal buses state in sync with incoming feed
  const [buses, setBuses] = useState<MapBus[]>(incomingBuses ?? []);
  useEffect(() => {
    setBuses(incomingBuses ?? []);
  }, [incomingBuses]);

  // Drift buses slightly around their current position ONLY when no external feed is provided
  useEffect(() => {
    if (incomingBuses && incomingBuses.length) return; // disable drift when live feed provided
    // Seed from first few stops if empty
    if (!buses.length) {
      const seeded: MapBus[] = resolvedStops
        .filter((s) => s.lat && s.lng)
        .slice(0, 3)
        .map((s, idx) => ({ id: `b${idx}`, code: idx === 0 ? "SVP-01" : idx === 1 ? "MDU-210" : "SVP-05", lat: s.lat!, lng: s.lng! }));
      setBuses(seeded);
    }
    const id = setInterval(() => {
      setBuses((prev) =>
        prev.map((b) => {
          const dLat = (Math.random() - 0.5) * 0.0015; // ~100-150m
          const dLng = (Math.random() - 0.5) * 0.0015;
          return { ...b, lat: b.lat + dLat, lng: b.lng + dLng };
        })
      );
    }, 3500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingBuses, resolvedStops.length]);

  const mapCenter = useMemo<LatLngExpression>(() => [center.lat, center.lng], [center]);

  return (
    <div className="relative w-full h-full">
      <MapContainer center={mapCenter} zoom={13} className="absolute inset-0" style={{ minHeight: 300 }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyTo center={mapCenter} />

        {/* Current location */}
        {currentLoc && (
          <CircleMarker center={[currentLoc.lat, currentLoc.lng]} radius={7} pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.6 }} />
        )}

        {/* Route polylines */}
        {polylines?.map((pl) => (
          <Polyline key={pl.id} positions={pl.points.map((p) => [p.lat, p.lng]) as LatLngExpression[]} pathOptions={{ color: pl.color || "#10b981", weight: 4, opacity: 0.8 }} />
        ))}

        {/* Stops */}
        {resolvedStops
          .filter((s) => s.lat != null && s.lng != null)
          .map((s) => (
            <Marker key={s.id} position={[s.lat!, s.lng!] as LatLngExpression} icon={L.divIcon({ html: "📍", className: "text-2xl", iconSize: [20, 20], iconAnchor: [10, 10] })}>
              <Popup>
                <div className="space-y-1">
                  <div className="font-medium">{s.name}</div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Buses */}
        {buses.map((b) => (
          <Marker key={b.id} position={[b.lat, b.lng] as LatLngExpression} icon={busDivIcon(b.code)}>
            <Popup>
              <div className="space-y-1">
                <div className="font-medium">Bus {b.code}</div>
                <div className="text-xs text-muted-foreground">{incomingBuses?.length ? "Live" : "Live (mock)"}</div>
                {typeof b.etaMins === "number" && (
                  <div className="pt-1">
                    <Badge variant="secondary">ETA: {b.etaMins} min</Badge>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default OSMMap;