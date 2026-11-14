"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
const MultimodalResults = dynamic(
  () =>
    import("./components/MultimodalResults").then(
      (module) => module.default
    ),
  { ssr: false }
);

type Flight = {
  id: number;
  price: number;
  duration: number;
  airline: string;
  departure?: string;
  arrival?: string;
  stops: number;
  segments: {
    from: string;
    to: string;
    airline: string;
  }[];
};

type Alternative = {
  airport: string;
  flights: Flight[];
  error?: string;
};

export default function Home() {
  const [from, setFrom] = useState("DSM");
  const [to, setTo] = useState("DEL");
  const [date, setDate] = useState("2026-12-10");
  const [budget, setBudget] = useState("1500");
  const [sort, setSort] = useState("price");
  const [mode, setMode] = useState("savings");
  const [message, setMessage] = useState("");
  const [today, setToday] = useState("");

  const [flights, setFlights] = useState<Flight[]>([]);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [recommendation, setRecommendation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [alternativeError, setAlternativeError] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<number | null>(null);

  useEffect(() => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    setToday(`${year}-${month}-${day}`);
  }, []);

  function formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  function formatDateTime(value?: string) {
    if (!value) return "Time unavailable";

    return value.replace(" ", " at ");
  }

  function sortFlights(items: Flight[]) {
    return [...items]
      .filter((flight) => {
        if (!budget) return true;
        return flight.price <= Number(budget);
      })
      .sort((a, b) => {
        if (sort === "duration") {
          return a.duration - b.duration;
        }

        if (sort === "recommended") {
          return (
            a.price + a.duration * 0.15 -
            (b.price + b.duration * 0.15)
          );
        }

        return a.price - b.price;
      });
  }

  async function searchFlights() {
    setLoading(true);
    setError("");
    setAlternativeError("");
    setFlights([]);
    setAlternatives([]);
    setRecommendation("");
    setSelectedFlight(null);
    setSearched(true);

    try {
      const params = new URLSearchParams({
        from: from.trim().toUpperCase(),
        to: to.trim().toUpperCase(),
        date,
      });

      // 1. Search the original departure airport
      const response = await fetch(
        `/api/flights?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Flight search failed");
      }

      const availableFlights: Flight[] = data.flights || [];
      setFlights(availableFlights);

      // 2. Search alternative departure airports
      // Requires app/api/alternatives/route.ts
      try {
        const alternativeResponse = await fetch(
          `/api/alternatives?${params.toString()}`
        );

        const alternativeData = await alternativeResponse.json();

        if (alternativeResponse.ok) {
          setAlternatives(alternativeData.alternatives || []);
        } else {
          setAlternativeError(
            alternativeData.error ||
              "Alternative airport search unavailable."
          );
        }
      } catch {
        setAlternativeError(
          "Could not search alternative airports."
        );
      }

      // 3. Ask Gemini to analyze flights within budget
      const withinBudget = availableFlights.filter(
        (flight) =>
          !budget || flight.price <= Number(budget)
      );

      if (withinBudget.length > 0) {
        try {
          const aiResponse = await fetch("/api/gemini", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message:
                message.trim() ||
                `Recommend the best flight from ${from} to ${to}. ` +
                `My maximum budget is ${budget || "unlimited"}. ` +
                `Prioritize ${
                  mode === "emergency" ? "speed" : "cost"
                }.`,
              routes: withinBudget,
            }),
          });

          const aiData = await aiResponse.json();

          if (aiResponse.ok) {
            setRecommendation(aiData.answer || "");
          }
        } catch {
          // Flight results still work without Gemini.
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  const sortedFlights = sortFlights(flights);

  const inputStyle =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 " +
    "text-gray-900 outline-none transition focus:border-emerald-500 " +
    "focus:ring-2 focus:ring-emerald-100";

  const labelStyle =
    "mb-2 block text-sm font-medium text-gray-700";

  return (
    <main className="min-h-screen bg-[#F4F8F5] text-gray-900">

      {/* NAVIGATION */}
      <nav className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-xl text-white">
              ✈
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Expected Circumstances
              </h1>

              <p className="text-xs text-gray-500">
                Travel smarter. Spend less.
              </p>
            </div>
          </div>

          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
            BETA
          </span>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-5 py-12">

        {/* INTRO */}
        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-600">
            Smarter journeys start here
          </p>

          <h2 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">
            Your journey begins here.
          </h2>

          <p className="max-w-2xl text-gray-500">
            Compare flights, explore alternative airports,
            and discover more affordable ways to travel.
          </p>
        </div>

        {/* TWO COLUMN LAYOUT */}
        <div className="grid items-start gap-8 lg:grid-cols-[400px_1fr]">

          {/* LEFT: SEARCH FORM */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

            <h3 className="mb-5 text-xl font-bold">
              Plan your trip
            </h3>

            {/* SEARCH MODE */}
            <div className="mb-7 flex rounded-xl bg-gray-100 p-1">
              <button
                onClick={() => setMode("savings")}
                className={`flex-1 rounded-lg px-3 py-3 text-sm font-semibold transition ${
                  mode === "savings"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Save Money
              </button>

              <button
                onClick={() => setMode("emergency")}
                className={`flex-1 rounded-lg px-3 py-3 text-sm font-semibold transition ${
                  mode === "emergency"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Fastest Flights
              </button>
            </div>

            <div className="space-y-5">

              <div>
                <label className={labelStyle}>
                  Departure Airport
                </label>

                <input
                  value={from}
                  maxLength={3}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="DSM"
                  className={`${inputStyle} uppercase`}
                />
              </div>

              <div>
                <label className={labelStyle}>
                  Destination Airport
                </label>

                <input
                  value={to}
                  maxLength={3}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="DEL"
                  className={`${inputStyle} uppercase`}
                />
              </div>

              <div>
                <label className={labelStyle}>
                  Departure Date
                </label>

                <input
                  type="date"
                  value={date}
                  min={today || undefined}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>
                  Maximum Budget ($)
                </label>

                <input
                  type="number"
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="No limit"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>
                  Travel Preferences (Optional)
                </label>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Prefer fewer stops, shorter flights..."
                  className={inputStyle}
                />
              </div>

              <button
                onClick={searchFlights}
                disabled={
                  loading ||
                  !/^[a-zA-Z]{3}$/.test(from.trim()) ||
                  !/^[a-zA-Z]{3}$/.test(to.trim()) ||
                  !date
                }
                className="w-full rounded-xl bg-emerald-500 py-4 font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Searching flights..." : "Find Best Routes →"}
              </button>

              <p className="text-center text-xs text-gray-400">
                Flight fares are subject to availability and change.
              </p>

            </div>
          </section>

          {/* RIGHT: RESULTS */}
          <div className="space-y-6">

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold">
                  Available Flights
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {searched
                    ? `${sortedFlights.length} flights within budget`
                    : "Search to discover your options"}
                </p>
              </div>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500"
              >
                <option value="price">Cheapest First</option>
                <option value="duration">Fastest First</option>
                <option value="recommended">Recommended</option>
              </select>
            </div>

            {/* ERROR */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
                {error}
              </div>
            )}

            {/* LOADING */}
            {loading && (
              <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />
                <p className="font-semibold">
                  Finding your best routes...
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Comparing flight options
                </p>
              </div>
            )}

            {/* INITIAL STATE */}
            {!searched && !loading && (
              <div className="rounded-2xl border border-gray-100 bg-white px-8 py-16 text-center shadow-sm">
                <div className="mb-4 text-5xl">✈</div>

                <h4 className="mb-2 text-xl font-bold">
                  Ready for takeoff?
                </h4>

                <p className="text-gray-500">
                  Enter your travel details and click
                  Find Best Routes to get started.
                </p>
              </div>
            )}

            {/* FLIGHT CARDS */}
            {!loading &&
              sortedFlights.map((flight, index) => (
                <div
                  key={flight.id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                >

                  <div className="p-6">
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">

                      <div>
                        {index === 0 && (
                          <span className="mb-3 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Best match for selected sort
                          </span>
                        )}

                        <h4 className="text-lg font-bold">
                          {flight.airline}
                        </h4>

                        <p className="mt-1 text-sm text-gray-400">
                          {flight.stops === 0
                            ? "Nonstop"
                            : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
                          {" · "}
                          {formatDuration(flight.duration)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900">
                          ${flight.price.toLocaleString()}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          Flight fare
                        </p>
                      </div>
                    </div>

                    {/* AIRPORT ROUTE */}
                    <div className="mb-5 rounded-xl bg-[#F4F8F5] p-4">
                      <div className="flex items-center justify-between gap-3">

                        <div>
                          <p className="text-xl font-bold">
                            {flight.segments[0]?.from || from}
                          </p>
                          <p className="text-xs text-gray-400">
                            Departure
                          </p>
                        </div>

                        <div className="flex flex-1 items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                          <div className="h-px flex-1 bg-emerald-200" />
                          <span className="text-emerald-600">✈</span>
                          <div className="h-px flex-1 bg-emerald-200" />
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-bold">
                            {flight.segments[flight.segments.length - 1]?.to || to}
                          </p>
                          <p className="text-xs text-gray-400">
                            Arrival
                          </p>
                        </div>

                      </div>
                    </div>

                    <div className="mb-5 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="mb-1 text-gray-400">
                          Departs
                        </p>
                        <p className="font-medium">
                          {formatDateTime(flight.departure)}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1 text-gray-400">
                          Arrives
                        </p>
                        <p className="font-medium">
                          {formatDateTime(flight.arrival)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">

                      <button
                        onClick={() =>
                          setSelectedFlight(
                            selectedFlight === flight.id
                              ? null
                              : flight.id
                          )
                        }
                        className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        {selectedFlight === flight.id
                          ? "Hide Details"
                          : "Flight Details"}
                      </button>

                      <span className="rounded-lg bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                        Flight option
                      </span>
                    </div>

                    {/* EXPANDED FLIGHT DETAILS */}
                    {selectedFlight === flight.id && (
                      <div className="mt-5 border-t border-gray-100 pt-5">

                        <h5 className="mb-3 font-semibold">
                          Flight segments
                        </h5>

                        <div className="space-y-3">
                          {flight.segments.map((segment, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm"
                            >
                              <span className="font-medium">
                                {segment.from} → {segment.to}
                              </span>

                              <span className="text-gray-500">
                                {segment.airline}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

            {/* NO FLIGHTS WITHIN BUDGET */}
            {!loading && searched && flights.length > 0 &&
              sortedFlights.length === 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
                  <h4 className="mb-2 text-lg font-bold">
                    No flights within your budget
                  </h4>

                  <p className="text-gray-500">
                    Try increasing your maximum budget.
                  </p>
                </div>
              )}

            {!loading && searched && flights.length === 0 && !error && (
              <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-500">
                No flights found for this search.
              </div>
            )}

          </div>
        </div>

        {/* GEMINI RECOMMENDATIONS */}
        {recommendation && !loading && (
          <section className="mt-12 rounded-2xl border border-emerald-100 bg-white p-7 shadow-sm">

            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-xl">
                ✨
              </div>

              <div>
                <h3 className="text-xl font-bold">
                  AI Travel Insights
                </h3>
                <p className="text-sm text-gray-500">
                  Powered by Gemini
                </p>
              </div>
            </div>

            <p className="whitespace-pre-wrap leading-7 text-gray-700">
              {recommendation}
            </p>
          </section>
        )}

        {/* ALTERNATIVE DEPARTURE AIRPORTS */}
        {!loading && alternatives.length > 0 && (
          <section className="mt-12">

            <div className="mb-6">
              <h3 className="text-2xl font-bold">
                Explore Alternative Airports
              </h3>

              <p className="mt-2 text-gray-500">
                Compare flights departing from other airports.
                Ground transportation costs and connection
                feasibility are not included yet.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {alternatives.map((option) => {
                const available = sortFlights(option.flights);

                return (
                  <div
                    key={option.airport}
                    className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                          Alternative airport
                        </p>

                        <h4 className="mt-1 text-2xl font-bold">
                          {option.airport}
                        </h4>
                      </div>

                      <span className="text-2xl">✈</span>
                    </div>

                    {option.error ? (
                      <p className="text-sm text-red-600">
                        Search unavailable
                      </p>
                    ) : available.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No flights within your budget.
                      </p>
                    ) : (
                      <>
                        <p className="text-3xl font-bold">
                          ${available[0].price.toLocaleString()}
                        </p>

                        <p className="mt-2 text-sm text-gray-600">
                          {available[0].airline}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {formatDuration(available[0].duration)}
                        </p>

                        <p className="mt-5 border-t border-gray-100 pt-4 text-xs text-gray-400">
                          Flight only · Ground transport not included
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {alternativeError && !loading && (
          <p className="mt-6 text-sm text-amber-700">
            {alternativeError}
          </p>
        )}

        {/* MULTIMODAL RESULTS - ADD THIS */}
        {searched && flights.length > 0 && !loading && (
          <MultimodalResults
            from={from}
            to={to}
            date={date}
            budget={Number(budget)}
            originalFlights={flights}
          />
        )}

        {/* FOOTER */}
        <footer className="mt-16 border-t border-gray-200 pt-6 text-center text-sm text-gray-400">
          © 2026 Expected Circumstances · Travel smarter, not harder.
        </footer>


      </div>
    </main>
  );
}
