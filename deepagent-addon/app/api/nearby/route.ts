// Lists catalog airports near an origin. Pure math on lib/airports.ts: no API credits.
// Used by the deep agent's airport-scout subagent.
import { NextRequest, NextResponse } from "next/server";
import { haversineMiles, nearbyAirports, resolveAirport } from "../../../lib/airports";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const origin = resolveAirport(p.get("from") || "");
  const miles = Math.min(1200, Math.max(50, Number(p.get("miles")) || 700));
  if (!origin || origin.latitude === null) {
    return NextResponse.json({ error: "Unknown origin airport" }, { status: 400 });
  }
  const airports = nearbyAirports(origin, miles, 12).map((a) => ({
    code: a.code,
    name: a.name,
    city: a.city,
    straightLineMiles: Math.round(haversineMiles(origin, a) ?? 0),
  }));
  return NextResponse.json({ origin: origin.code, maxMiles: miles, airports });
}
