
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const from = params.get("from")?.toUpperCase();
  const to = params.get("to")?.toUpperCase();
  const date = params.get("date");
  const returnDate = params.get("returnDate");

  if (
    !from || !to || !date ||
    !/^[A-Z]{3}$/.test(from) ||
    !/^[A-Z]{3}$/.test(to) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    (returnDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(returnDate))
  ) {
    return NextResponse.json(
      { error: "Enter valid airport codes and dates" },
      { status: 400 }
    );
  }

  if (!process.env.SERPAPI_KEY) {
    return NextResponse.json(
      { error: "Missing SERPAPI_KEY" },
      { status: 500 }
    );
  }

  const query = new URLSearchParams({
    engine: "google_flights",
    api_key: process.env.SERPAPI_KEY,
    departure_id: from,
    arrival_id: to,
    outbound_date: date,
    type: returnDate ? "1" : "2",
    currency: "USD",
    hl: "en"
  });

  if (returnDate) {
    query.set("return_date", returnDate);
  }

  try {
    const response = await fetch(
      `https://serpapi.com/search.json?${query}`,
      { cache: "no-store" }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error("Flight provider returned an error");
    }

    const results = [
      ...(data.best_flights || []),
      ...(data.other_flights || [])
    ];

    const flights = results
      .filter((item: any) =>
        typeof item.price === "number" &&
        typeof item.total_duration === "number" &&
        Array.isArray(item.flights) &&
        item.flights.length > 0
      )
      .filter((item: any) => {
        const segments = item.flights;
        const first = segments[0];
        const last = segments[segments.length - 1];

        // Only accept journeys starting and ending
        // at the airports the user requested.
        return (
          first.departure_airport?.id === from &&
          last.arrival_airport?.id === to
        );
      })
      .map((item: any, index: number) => ({
        id: index,
        price: item.price,
        duration: item.total_duration,
        airline: item.flights[0].airline || "Airline",
        departure: item.flights[0].departure_airport?.time,
        arrival:
          item.flights[item.flights.length - 1]
            .arrival_airport?.time,
        stops: item.flights.length - 1,
        segments: item.flights.map((flight: any) => ({
          from: flight.departure_airport?.id,
          to: flight.arrival_airport?.id,
          airline: flight.airline
        }))
      }));

    return NextResponse.json({ flights });

  } catch {
    return NextResponse.json(
      { error: "Could not search flights" },
      { status: 502 }
    );
  }
}
