import { NextResponse } from "next/server";

// Simple mock live feed that can be replaced later with a real provider.
// Shape is stable so the frontend can seamlessly upgrade when a real feed is wired.
// If you deploy a real feed, keep the same response structure.
export async function GET() {
  // Static-ish demo positions near Srivilliputhur / Krishnankovil / Kalasalingam
  const now = Date.now();
  const buses = [
    {
      id: "bus_svp05",
      code: "SVP-05",
      lat: 9.4938,
      lng: 77.6322, // near Krishnankovil
      routes: ["SVP-05"],
      userReports: [
        { lat: 9.4929, lng: 77.6318, ts: now - 20_000 }, // prefer user report when close
        { lat: 9.4944, lng: 77.6331, ts: now - 45_000 },
      ],
    },
    {
      id: "bus_mdu210",
      code: "MDU-210",
      lat: 9.5088,
      lng: 77.6369, // near SVP Bus Stand
      routes: ["MDU-210"],
      userReports: [],
    },
    {
      id: "bus_svp01",
      code: "SVP-01",
      lat: 9.5235,
      lng: 77.6710, // Sethunarayanapuram side
      routes: ["SVP-01"],
      userReports: [],
    },
  ];

  return NextResponse.json({ buses });
}