
"use client";

import { useState, useEffect } from "react";

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


export default function Home() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [message, setMessage] = useState("");
  const [today, setToday] = useState("");

  const [flights, setFlights] = useState<Flight[]>([]);
  const [recommendation, setRecommendation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    setToday(`${year}-${month}-${day}`);
  }, []);

  async function searchFlights() {
    setLoading(true);
    setError("");
    setFlights([]);
    setRecommendation("");

    try {
      const params = new URLSearchParams({
        from: from.trim().toUpperCase(),
        to: to.trim().toUpperCase(),
        date,
      });

      if (returnDate) {
        params.set("returnDate", returnDate);
      }

      const flightResponse = await fetch(
        `/api/flights?${params.toString()}`
      );

      const flightData = await flightResponse.json();

      if (!flightResponse.ok) {
        throw new Error(
          flightData.error || "Flight search failed"
        );
      }

      const availableFlights: Flight[] =
        flightData.flights || [];

      setFlights(availableFlights);

      if (availableFlights.length === 0) {
        setError("No flights found for this search.");
        return;
      }

      const geminiResponse = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message:
            message.trim() ||
            `Find the best flight from ${from.toUpperCase()} to ${to.toUpperCase()} on ${date}.`,
          routes: availableFlights,
        }),
      });

      const geminiData = await geminiResponse.json();

      if (!geminiResponse.ok) {
        throw new Error(
          geminiData.error || "AI recommendation failed"
        );
      }

      setRecommendation(geminiData.answer);

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

  function formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return `${hours}h ${remaining}m`;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-12">
      <div className="max-w-4xl mx-auto">

        <header className="mb-10">
          <h1 className="text-4xl font-bold mb-3">
            FluentAI
          </h1>
          <p className="text-slate-400">
            AI-powered emergency travel assistant
          </p>
        </header>

        <section className="bg-slate-900 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6">
            Find Your Flight
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mb-4">

            <div>
              <label className="block mb-2">
                Departure Airport
              </label>
              <input
                type="text"
                placeholder="JFK"
                maxLength={3}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              />
            </div>

            <div>
              <label className="block mb-2">
                Destination Airport
              </label>
              <input
                type="text"
                placeholder="LAX"
                maxLength={3}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              />
            </div>

            <div>
              <label className="block mb-2">
                Departure Date
              </label>
              <input
                type="date"
                value={date}
                min={today || undefined}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              />
            </div>

            <div>
              <label className="block mb-2">
                Return Date (Optional)
              </label>
              <input
                type="date"
                value={returnDate}
                min={date || undefined}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
              />
            </div>

          </div>

          <label className="block mb-2">
            Describe Your Travel Situation
          </label>

          <textarea
            placeholder="Example: My flight was cancelled and I need to get home as quickly as possible."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 mb-5"
          />

          <button
            onClick={searchFlights}
            disabled={
              loading ||
              !/^[a-zA-Z]{3}$/.test(from.trim()) ||
              !/^[a-zA-Z]{3}$/.test(to.trim()) ||
              !date ||
              (returnDate !== "" && returnDate < date)
            }
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed p-4 rounded-lg font-semibold"
          >
            {loading
              ? "Searching Flights..."
              : "Find Best Travel Option"}
          </button>
        </section>

        {error && (
          <div className="bg-red-950 border border-red-700 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {recommendation && (
          <section className="bg-blue-950 border border-blue-800 rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              AI Recommendation
            </h2>
            <p className="whitespace-pre-wrap leading-7">
              {recommendation}
            </p>
          </section>
        )}

        {flights.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-5">
              Available Flights
            </h2>

            <div className="space-y-4">
              {flights.map((flight) => (
                <div
                  key={flight.id}
                  className="bg-slate-900 rounded-xl p-5 border border-slate-800"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {flight.airline}
                      </h3>

                      <p className="text-slate-400 mt-2">
                        {flight.departure || "Time unavailable"}
                        {" → "}
                        {flight.arrival || "Time unavailable"}
                      </p>

                      <p className="text-slate-400 mt-2">
                        Duration: {formatDuration(flight.duration)}
                      </p>

                      <p className="text-slate-400">
                        Stops: {flight.stops}
                      </p>
                    </div>

                    <p className="text-2xl font-bold text-green-400">
                      ${flight.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
