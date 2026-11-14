
export type ConnectionCheck = {
  status: "estimated" | "unknown";
  flightDeparture: string | null;
  latestAirportArrival: string | null;
  latestGroundDeparture: string | null;
  bufferMinutes: number;
};

export function checkConnection(
  departure: string | undefined,
  groundMinutes: number | null,
  bufferMinutes = 180
): ConnectionCheck {
  const unknown: ConnectionCheck = {
    status: "unknown",
    flightDeparture: departure ?? null,
    latestAirportArrival: null,
    latestGroundDeparture: null,
    bufferMinutes,
  };

  if (
    !departure ||
    groundMinutes === null ||
    !Number.isFinite(groundMinutes) ||
    groundMinutes < 0
  ) {
    return unknown;
  }

  // The API provides airport-local departure times.
  // Preserve that local clock time instead of treating it
  // as the user's computer timezone.
  const match = departure.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
  );

  if (!match) {
    return unknown;
  }

  const [, year, month, day, hour, minute] = match;

  const flightTime = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute)
    )
  );

  if (Number.isNaN(flightTime.getTime())) {
    return unknown;
  }

  function formatLocalClock(date: Date) {
    return date.toISOString().slice(0, 16).replace("T", " ");
  }

  const airportArrival = new Date(
    flightTime.getTime() - bufferMinutes * 60_000
  );

  const groundDeparture = new Date(
    airportArrival.getTime() - groundMinutes * 60_000
  );

  return {
    status: "estimated",
    flightDeparture: formatLocalClock(flightTime),
    latestAirportArrival: formatLocalClock(airportArrival),
    latestGroundDeparture: formatLocalClock(groundDeparture),
    bufferMinutes,
  };
}
