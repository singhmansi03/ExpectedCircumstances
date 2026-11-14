
import { NextRequest, NextResponse } from "next/server";

const airportOptions: Record<string, string[]> = {
  DSM: ["OMA", "MCI", "CID"],
  JFK: ["EWR", "LGA", "PHL"],
  LAX: ["BUR", "ONT", "SNA"],
};

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const from = params.get("from")?.toUpperCase();
  const to = params.get("to")?.toUpperCase();
  const date = params.get("date");

  if (
    !from ||
    !to ||
    !date ||
    !/^[A-Z]{3}$/.test(from) ||
    !/^[A-Z]{3}$/.test(to) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return NextResponse.json(
      { error: "Invalid airport codes or date" },
      { status: 400 }
    );
  }

  if (!process.env.SERPAPI_KEY) {
    return NextResponse.json(
      { error: "Missing SERPAPI_KEY" },
      { status: 500 }
    );
  }

  const airports = airportOptions[from] || [];

  const results = await Promise.all(
    airports.map(async (airport) => {
      try {
        const query = new URLSearchParams({
          engine: "google_flights",
          api_key: process.env.SERPAPI_KEY!,
          departure_id: airport,
          arrival_id: to,
          outbound_date: date,
          type: "2",
          currency: "USD",
          hl: "en",
        });

        const response = await fetch(
          `https://serpapi.com/search.json?${query}`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok || data.error) {
          return {
            airport,
            flights: [],
            error: "Provider search failed",
          };
        }

        const rawFlights = [
          ...(data.best_flights || []),
          ...(data.other_flights || []),
        ];

        const flights = rawFlights
          .filter((item: any) => {
            if (
              typeof item.price !== "number" ||
              typeof item.total_duration !== "number" ||
              !Array.isArray(item.flights) ||
              item.flights.length === 0
            ) {
              return false;
            }

            const first = item.flights[0];
            const last = item.flights[item.flights.length - 1];

            return (
              first.departure_airport?.id === airport &&
              last.arrival_airport?.id === to
            );
          })
          .map((item: any, index: number) => ({
            id: index,
            price: item.price,
            duration: item.total_duration,
            airline: item.flights[0].airline || "Airline",
            departure:
              item.flights[0].departure_airport?.time,
            arrival:
              item.flights[item.flights.length - 1]
                .arrival_airport?.time,
            stops: item.flights.length - 1,
            segments: item.flights.map((flight: any) => ({
              from: flight.departure_airport?.id,
              to: flight.arrival_airport?.id,
              airline: flight.airline,
            })),
          }));

        return { airport, flights };
      } catch {
        return {
          airport,
          flights: [],
          error: "Search failed",
        };
      }
    })
  );

  return NextResponse.json({ alternatives: results });
}
