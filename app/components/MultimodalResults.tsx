
// "use client";

// import { useEffect, useState } from "react";
// import { compareRoutes } from "../../lib/optimizer";

// type Flight = {
//   id: number;
//   price: number;
//   duration: number;
//   airline: string;
//   departure?: string;
//   arrival?: string;
//   stops: number;
// };

// type Alternative = {
//   airport: string;
//   flights: Flight[];
//   error?: string;
// };

// type GroundRoute = {
//   available: boolean;
//   durationMinutes?: number | null;
//   distanceMiles?: number | null;
//   fareUSD?: number | null;
//   fareKnown?: boolean;
// };

// type Option = {
//   airport: string;
//   flight: Flight;
//   ground: GroundRoute | null;
//   mode: "DRIVE" | "TRANSIT";
// };

// type Props = {
//   from: string;
//   to: string;
//   date: string;
//   budget: number;
//   originalFlights: Flight[];
// };

// function formatMinutes(minutes: number | null) {
//   if (minutes === null) return "Unknown";

//   const hours = Math.floor(minutes / 60);
//   const mins = minutes % 60;

//   return `${hours}h ${mins}m`;
// }

// export default function MultimodalResults({
//   from,
//   to,
//   date,
//   budget,
//   originalFlights,
// }: Props) {
//   const [options, setOptions] = useState<Option[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const cheapestOriginal = originalFlights
//     .filter((flight) => Number.isFinite(flight.price))
//     .reduce(
//       (lowest, flight) => Math.min(lowest, flight.price),
//       Infinity
//     );

//   useEffect(() => {
//     let cancelled = false;

//     async function load() {
//       if (
//         !from ||
//         !to ||
//         !date ||
//         originalFlights.length === 0
//       ) {
//         setOptions([]);
//         return;
//       }

//       setLoading(true);
//       setError("");
//       setOptions([]);

//       try {
//         const params = new URLSearchParams({
//           from: from.toUpperCase(),
//           to: to.toUpperCase(),
//           date,
//         });

//         const response = await fetch(
//           `/api/alternatives?${params.toString()}`
//         );

//         if (!response.ok) {
//           throw new Error("Could not load alternative flights");
//         }

//         const data = await response.json();

//         const alternatives: Alternative[] =
//           data.alternatives || [];

//         // Search ground routes for each nearby airport.
//         const results = await Promise.all(
//           alternatives.map(async (alternative) => {
//             const flights = alternative.flights || [];

//             if (flights.length === 0) return [];

//             // Use the cheapest flight from this airport.
//             const cheapest = [...flights].sort(
//               (a, b) => a.price - b.price
//             )[0];

//             const modes = ["DRIVE", "TRANSIT"] as const;

//             const groundResults = await Promise.all(
//               modes.map(async (mode) => {
//                 try {
//                   const groundParams = new URLSearchParams({
//                     from: from.toUpperCase(),
//                     to: alternative.airport.toUpperCase(),
//                     mode,
//                   });

//                   const groundResponse = await fetch(
//                     `/api/ground?${groundParams.toString()}`
//                   );

//                   if (!groundResponse.ok) return null;

//                   const groundData: GroundRoute =
//                     await groundResponse.json();

//                   return groundData.available
//                     ? groundData
//                     : null;
//                 } catch {
//                   return null;
//                 }
//               })
//             );

//             return modes.map((mode, index) => ({
//               airport: alternative.airport,
//               flight: cheapest,
//               ground: groundResults[index],
//               mode,
//             }));
//           })
//         );

//         if (!cancelled) {
//           setOptions(results.flat());
//         }
//       } catch (err) {
//         if (!cancelled) {
//           setError(
//             err instanceof Error
//               ? err.message
//               : "Could not load multimodal routes"
//           );
//         }
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     }

//     load();

//     return () => {
//       cancelled = true;
//     };
//     // Search results are refreshed when the submitted inputs change.
//   }, [from, to, date, originalFlights]);

//   const compared = Number.isFinite(cheapestOriginal)
//     ? compareRoutes(
//         options.map((option) => ({
//           airport: option.airport,
//           flightPrice: option.flight.price,
//           flightDuration: option.flight.duration,

//           // Driving duration does NOT include a price.
//           // Transit fare is only used when provided.
//           groundPrice:
//             option.mode === "TRANSIT" &&
//             option.ground?.fareKnown === true
//               ? option.ground.fareUSD ?? null
//               : null,

//           groundDuration:
//             option.ground?.durationMinutes ?? null,

//           groundFareKnown:
//             option.mode === "TRANSIT" &&
//             option.ground?.fareKnown === true,

//           // We haven't checked flight connections yet.
//           connectionVerified: false,
//         })),
//         cheapestOriginal,
//         budget
//       )
//     : [];

//   return (
//     <section className="mt-8">
//       <div className="mb-4">
//         <h2 className="text-2xl font-bold text-gray-900">
//           Multimodal Travel Options
//         </h2>

//         <p className="mt-1 text-sm text-gray-500">
//           Compare nearby airports with driving and public
//           transit connections.
//         </p>
//       </div>

//       {loading && (
//         <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-800">
//           Finding ground connections to nearby airports...
//         </div>
//       )}

//       {error && (
//         <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
//           {error}
//         </div>
//       )}

//       {!loading && !error && options.length === 0 && (
//         <div className="rounded-xl border border-gray-200 bg-white p-5 text-gray-500">
//           No multimodal routes found for this search.
//         </div>
//       )}

//       <div className="space-y-4">
//         {!loading &&
//           options.map((option, index) => {
//             const result = compared[index];

//             // Match by index rather than relying on
//             // optimizer sorting.
//             const calculated = compared.find(
//               (item) =>
//                 item.airport === option.airport &&
//                 item.flightPrice === option.flight.price &&
//                 item.groundDuration ===
//                   (option.ground?.durationMinutes ?? null) &&
//                 item.groundFareKnown ===
//                   (option.mode === "TRANSIT" &&
//                     option.ground?.fareKnown === true)
//             );

//             const totalCost =
//               calculated?.totalCost ?? null;

//             const savings =
//               calculated?.savings ?? null;

//             return (
//               <div
//                 key={`${option.airport}-${option.mode}-${index}`}
//                 className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
//               >
//                 <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
//                   <div>
//                     <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
//                       Alternative Airport
//                     </p>

//                     <h3 className="text-xl font-bold text-gray-900">
//                       {from.toUpperCase()} →{" "}
//                       {option.airport} →{" "}
//                       {to.toUpperCase()}
//                     </h3>

//                     <p className="mt-1 text-sm text-gray-500">
//                       {option.mode === "DRIVE"
//                         ? "Driving + Flight"
//                         : "Public Transit + Flight"}
//                     </p>
//                   </div>

//                   <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
//                     Connection not verified
//                   </span>
//                 </div>

//                 <div className="grid gap-3 sm:grid-cols-2">
//                   <div className="rounded-xl bg-gray-50 p-4">
//                     <p className="text-sm text-gray-500">
//                       Ground transportation
//                     </p>

//                     <p className="mt-1 text-lg font-bold text-gray-900">
//                       {formatMinutes(
//                         option.ground?.durationMinutes ??
//                           null
//                       )}
//                     </p>

//                     <p className="text-sm text-gray-500">
//                       {option.ground?.distanceMiles ??
//                         "Unknown"}{" "}
//                       miles
//                     </p>

//                     <p className="mt-2 text-sm font-medium text-gray-700">
//                       Cost:{" "}
//                       {option.mode === "TRANSIT" &&
//                       option.ground?.fareKnown &&
//                       option.ground.fareUSD != null
//                         ? `$${option.ground.fareUSD.toFixed(2)}`
//                         : "Unknown"}
//                     </p>
//                   </div>

//                   <div className="rounded-xl bg-emerald-50 p-4">
//                     <p className="text-sm text-emerald-700">
//                       Flight from {option.airport}
//                     </p>

//                     <p className="mt-1 text-lg font-bold text-gray-900">
//                       ${option.flight.price.toLocaleString()}
//                     </p>

//                     <p className="text-sm text-gray-600">
//                       {option.flight.airline}
//                     </p>

//                     <p className="mt-2 text-sm text-gray-600">
//                       {formatMinutes(
//                         option.flight.duration
//                       )}{" "}
//                       in flight itinerary
//                     </p>
//                   </div>
//                 </div>

//                 <div className="mt-4 border-t border-gray-100 pt-4">
//                   <div className="flex flex-wrap items-center justify-between gap-3">
//                     <div>
//                       <p className="text-sm text-gray-500">
//                         Combined price
//                       </p>

//                       <p className="text-xl font-bold text-gray-900">
//                         {totalCost === null
//                           ? "Not yet available"
//                           : `$${totalCost.toFixed(2)}`}
//                       </p>
//                     </div>

//                     <div className="text-right">
//                       <p className="text-sm text-gray-500">
//                         {savings === null
//                           ? "Flight-only price difference"
//                           : "Potential savings"}
//                       </p>

//                       <p className="text-lg font-semibold text-emerald-700">
//                         {savings === null
//                           ? `$${(
//                               cheapestOriginal -
//                               option.flight.price
//                             ).toFixed(2)}`
//                           : `$${savings.toFixed(2)}`}
//                       </p>
//                     </div>
//                   </div>

//                   <p className="mt-3 text-xs text-gray-500">
//                     {totalCost === null
//                       ? "Ground fare is unknown, so this is not a confirmed total price."
//                       : "Ground fare was reported, but the connection schedule has not been verified."}
//                   </p>
//                 </div>
//               </div>
//             );
//           })}
//       </div>
//     </section>
//   );
// }
"use client";

type Props = {
  from: string;
  to: string;
  date: string;
  budget: number;
  originalFlights: {
    id: number;
    price: number;
    duration: number;
    airline: string;
    stops: number;
    segments: {
      from: string;
      to: string;
      airline: string;
    }[];
  }[];
};

export default function MultimodalResults({
  from,
  to,
  date,
  budget,
  originalFlights,
}: Props) {
  return (
    <div className="mt-8 rounded-xl bg-emerald-100 p-6 text-emerald-800">
      <h2 className="text-xl font-bold">
        Multimodal Component Working!
      </h2>

      <p>Route: {from} → {to}</p>
      <p>Date: {date}</p>
      <p>Budget: ${budget}</p>
      <p>Flights found: {originalFlights.length}</p>
    </div>
  );
}