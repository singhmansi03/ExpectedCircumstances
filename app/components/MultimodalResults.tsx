// "use client";

// import { useEffect, useState } from "react";
// import { checkConnection } from "../../lib/connectionFeasibility";

// type Flight = {
//   id: number;
//   price: number;
//   duration: number;
//   airline: string;
//   departure?: string;
//   arrival?: string;
//   stops: number;
//   segments: {
//     from: string;
//     to: string;
//     airline: string;
//   }[];
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
//   startTime?: string | null;
//   endTime?: string | null;
// };

// type TravelOption = {
//   airport: string;
//   flight: Flight;
//   mode: "DRIVE" | "TRANSIT";
//   ground: GroundRoute | null;
// };

// type Props = {
//   from: string;
//   to: string;
//   date: string;
//   budget: number;
//   originalFlights: Flight[];
//   alternatives: Alternative[];
// };

// function formatDuration(minutes: number | null | undefined) {
//   if (minutes == null || !Number.isFinite(minutes)) {
//     return "Unknown";
//   }

//   const hours = Math.floor(minutes / 60);
//   const mins = Math.round(minutes % 60);

//   return `${hours}h ${mins}m`;
// }

// function formatPrice(price: number) {
//   return `$${price.toLocaleString("en-US")}`;
// }

// export default function MultimodalResults({
//   from,
//   to,
//   date,
//   budget,
//   originalFlights,
//   alternatives,
// }: Props) {
//   const [options, setOptions] = useState<TravelOption[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const cheapestOriginal = originalFlights.reduce(
//     (lowest, flight) =>
//       Number.isFinite(flight.price)
//         ? Math.min(lowest, flight.price)
//         : lowest,
//     Infinity
//   );

//   useEffect(() => {
//     let cancelled = false;

//     async function loadGroundRoutes() {
//       setLoading(true);
//       setError("");
//       setOptions([]);

//       try {
//         const validAlternatives = alternatives.filter(
//           (alternative) =>
//             !alternative.error &&
//             alternative.flights.length > 0
//         );

//         const results = await Promise.all(
//           validAlternatives.map(async (alternative) => {
//             const cheapestFlight = [...alternative.flights]
//               .filter((flight) =>
//                 Number.isFinite(flight.price)
//               )
//               .sort((a, b) => a.price - b.price)[0];

//             if (!cheapestFlight) {
//               return [];
//             }

//             const modes = ["DRIVE", "TRANSIT"] as const;

//             const groundRoutes = await Promise.all(
//               modes.map(async (mode) => {
//                 try {
//                   const params = new URLSearchParams({
//                     from: from.toUpperCase(),
//                     to: alternative.airport.toUpperCase(),
//                     mode,
//                   });

//                   const response = await fetch(
//                     `/api/ground?${params.toString()}`
//                   );

//                   if (!response.ok) {
//                     return null;
//                   }

//                   const data: GroundRoute =
//                     await response.json();

//                   return data.available ? data : null;
//                 } catch {
//                   return null;
//                 }
//               })
//             );

//             return modes.map((mode, index) => ({
//               airport: alternative.airport,
//               flight: cheapestFlight,
//               mode,
//               ground: groundRoutes[index],
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
//               : "Could not load ground routes"
//           );
//         }
//       } finally {
//         if (!cancelled) {
//           setLoading(false);
//         }
//       }
//     }

//     if (alternatives.length > 0) {
//       loadGroundRoutes();
//     } else {
//       setOptions([]);
//       setLoading(false);
//     }

//     return () => {
//       cancelled = true;
//     };
//   }, [from, to, date, alternatives]);

//   return (
//     <section className="mt-12">
//       <div className="mb-6">
//         <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-emerald-600">
//           Multimodal Travel Optimizer
//         </p>

//         <h2 className="text-3xl font-bold text-gray-900">
//           Combine Ground Travel + Flights
//         </h2>

//         <p className="mt-2 max-w-3xl text-gray-500">
//           Compare driving or public transit to nearby airports,
//           followed by a flight to your destination.
//         </p>
//       </div>

//       {Number.isFinite(cheapestOriginal) && (
//         <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
//           <p className="text-sm font-medium text-emerald-700">
//             Cheapest flight from {from.toUpperCase()}
//           </p>

//           <p className="mt-2 text-3xl font-bold text-gray-900">
//             {formatPrice(cheapestOriginal)}
//           </p>

//           <p className="mt-1 text-sm text-gray-600">
//             This is the flight-only baseline used for comparison.
//           </p>
//         </div>
//       )}

//       {loading && (
//         <div className="rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
//           <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />

//           <p className="font-semibold text-gray-900">
//             Finding ground transportation...
//           </p>

//           <p className="mt-2 text-sm text-gray-500">
//             Checking driving and transit routes to nearby airports.
//           </p>
//         </div>
//       )}

//       {error && (
//         <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
//           {error}
//         </div>
//       )}

//       {!loading && !error && options.length === 0 && (
//         <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500">
//           No multimodal routes available for this search.
//         </div>
//       )}

//       {!loading && options.length > 0 && (
//         <div className="grid gap-5 md:grid-cols-2">
//           {options.map((option) => {
//             const groundDuration =
//   option.ground?.durationMinutes ?? null;

// const connection = checkConnection(
//   option.flight.departure,
//   groundDuration
// );

//             const groundFare =
//               option.mode === "TRANSIT" &&
//               option.ground?.fareKnown === true &&
//               typeof option.ground.fareUSD === "number"
//                 ? option.ground.fareUSD
//                 : null;

//             const totalCost =
//               groundFare === null
//                 ? null
//                 : option.flight.price + groundFare;

//             const totalDuration =
//               groundDuration === null
//                 ? null
//                 : groundDuration + option.flight.duration;

//             const flightPriceDifference =
//               Number.isFinite(cheapestOriginal)
//                 ? cheapestOriginal - option.flight.price
//                 : null;

//             const potentialSavings =
//               totalCost !== null &&
//               Number.isFinite(cheapestOriginal)
//                 ? cheapestOriginal - totalCost
//                 : null;

//             const withinBudget =
//               totalCost !== null &&
//               (budget <= 0 || totalCost <= budget);

//             return (
//               <div
//                 key={`${option.airport}-${option.mode}`}
//                 className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:border-emerald-200 hover:shadow-md"
//               >
//                 <div className="p-6">
//                   <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
//                     <div>
//                       <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
//                         Alternative Airport
//                       </p>

//                       <h3 className="mt-1 text-xl font-bold text-gray-900">
//                         {from.toUpperCase()} → {option.airport} →{" "}
//                         {to.toUpperCase()}
//                       </h3>

//                       <p className="mt-2 text-sm text-gray-500">
//                         {option.mode === "DRIVE"
//                           ? "🚗 Driving + Flight"
//                           : "🚆 Public Transit + Flight"}
//                       </p>
//                     </div>

//                     <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
//                     {connection.status === "estimated"
//                         ? "Timing estimated"
//                         : "Connection unknown"}
//                     </span>
//                     {connection.status === "estimated" && (
//   <div className="w-full rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
//     <p className="font-semibold">
//       Suggested Connection Schedule
//     </p>

//     <p className="mt-2">
//       Leave {from.toUpperCase()} by:{" "}
//       <strong>{connection.latestGroundDeparture}</strong>
//     </p>

//     <p className="mt-1">
//       Arrive at {option.airport} by:{" "}
//       <strong>{connection.latestAirportArrival}</strong>
//     </p>

//     <p className="mt-1">
//       Flight departs:{" "}
//       <strong>{connection.flightDeparture}</strong>
//     </p>

//     <p className="mt-2 text-xs text-blue-700">
//       Includes a 3-hour airport buffer. Times are estimates
//       in the departure airport's local timezone; traffic,
//       transit schedules, and actual connection feasibility
//       have not been verified.
//     </p>
//   </div>
// )}
//                   </div>

//                   <div className="mb-5 grid gap-3 sm:grid-cols-2">
//                     <div className="rounded-xl bg-gray-50 p-4">
//                       <p className="text-sm text-gray-500">
//                         Ground Transportation
//                       </p>

//                       <p className="mt-2 text-xl font-bold text-gray-900">
//                         {formatDuration(groundDuration)}
//                       </p>

//                       <p className="mt-1 text-sm text-gray-500">
//                         {option.ground?.distanceMiles != null
//                           ? `${option.ground.distanceMiles} miles`
//                           : "Distance unavailable"}
//                       </p>

//                       <p className="mt-3 text-sm font-medium text-gray-700">
//                         Cost:{" "}
//                         {groundFare !== null
//                           ? formatPrice(groundFare)
//                           : "Unknown"}
//                       </p>
//                     </div>

//                     <div className="rounded-xl bg-emerald-50 p-4">
//                       <p className="text-sm text-emerald-700">
//                         Flight from {option.airport}
//                       </p>

//                       <p className="mt-2 text-xl font-bold text-gray-900">
//                         {formatPrice(option.flight.price)}
//                       </p>

//                       <p className="mt-1 text-sm text-gray-600">
//                         {option.flight.airline}
//                       </p>

//                       <p className="mt-3 text-sm text-gray-600">
//                         {formatDuration(option.flight.duration)}
//                         {" · "}
//                         {option.flight.stops} stop
//                         {option.flight.stops === 1 ? "" : "s"}
//                       </p>
//                     </div>
//                   </div>

//                   <div className="rounded-xl border border-gray-100 p-4">
//                     <div className="flex items-center justify-between gap-4">
//                       <div>
//                         <p className="text-sm text-gray-500">
//                           Combined Price
//                         </p>

//                         <p className="mt-1 text-2xl font-bold text-gray-900">
//                           {totalCost === null
//                             ? "Unknown"
//                             : formatPrice(totalCost)}
//                         </p>
//                       </div>

//                       <div className="text-right">
//                         <p className="text-sm text-gray-500">
//                           Combined Travel Time
//                         </p>

//                         <p className="mt-1 text-lg font-semibold text-gray-900">
//                           {formatDuration(totalDuration)}
//                         </p>
//                       </div>
//                     </div>

//                     <div className="mt-4 border-t border-gray-100 pt-4">
//                       <p className="text-sm text-gray-500">
//                         {potentialSavings !== null
//                           ? "Price difference including reported ground fare"
//                           : "Flight-only price difference"}
//                       </p>

//                       <p
//                         className={`mt-1 text-lg font-bold ${
//                           (potentialSavings ??
//                             flightPriceDifference ??
//                             0) > 0
//                             ? "text-emerald-600"
//                             : "text-gray-900"
//                         }`}
//                       >
//                         {(potentialSavings ??
//                           flightPriceDifference) === null
//                           ? "Unavailable"
//                           : (potentialSavings ??
//                               flightPriceDifference)! >= 0
//                           ? `${formatPrice(
//                               (potentialSavings ??
//                                 flightPriceDifference)!
//                             )} lower`
//                           : `${formatPrice(
//                               Math.abs(
//                                 (potentialSavings ??
//                                   flightPriceDifference)!
//                               )
//                             )} higher`}
//                       </p>

//                       <p className="mt-2 text-xs text-gray-500">
//                         {totalCost === null
//                           ? "Ground transportation cost is unknown. This is not a confirmed total or savings amount."
//                           : "Ground fare was reported, but connection timing and feasibility have not been verified."}
//                       </p>

//                       {totalCost !== null && (
//                         <p className="mt-2 text-xs font-medium text-gray-600">
//                           {withinBudget
//                             ? "Reported total is within your budget."
//                             : "Reported total exceeds your budget."}
//                         </p>
//                       )}

//                       {option.flight.departure && (
//                         <p className="mt-2 text-xs text-gray-500">
//                           Flight departure:{" "}
//                           {option.flight.departure}
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}

//       <p className="mt-5 text-xs leading-5 text-gray-400">
//         Ground travel estimates may not match your departure
//         date or time. Allow time for airport check-in, security,
//         traffic, and transfers. Driving costs are not calculated.
//         Connections have not been verified.
//       </p>
//     </section>
//   );
// }


"use client";
import type { Journey, SearchResponse } from "../../lib/types";

const money=(v:number|null)=>v===null?"Fare unknown":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v);
const duration=(v:number)=>`${Math.floor(v/60)}h ${v%60}m`;
function timestamp(epoch:number|null,timeZone:string|null) {
 if(epoch===null)return "Arrival time unavailable";
 return new Intl.DateTimeFormat("en-US",{timeZone:timeZone||"UTC",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(new Date(epoch));
}
function icon(mode:string){return ({drive:"🚗",rideshare:"🚕",bus:"🚌",train:"🚆",transit:"🚉"} as Record<string,string>)[mode]||"✈️";}
function JourneyCard({journey,index,result}:{journey:Journey;index:number;result:SearchResponse}) {
 const alt=journey.kind==="alternate-airport";const groundOnly=journey.kind==="ground-only";
 const status=journey.costType==="unknown"?"Unpriced transfer":journey.costType==="estimated"?"Includes estimates":"Known fare total";
 return <article className="journey-card">
   <div className="journey-main">
     <div className="card-top"><div className="flex flex-wrap items-center gap-2">
       {index===0&&<span className="pill primary">Top result</span>}
       <span className="pill">{groundOnly?"Ground only":alt?"Alternate airport":"Original airport"}</span>
       <span className="pill muted">{journey.connectionStatus==="unverified"?"Verify connection":"Check flight availability"}</span>
     </div><div className="price-col"><strong>{money(journey.estimatedTotalUSD)}</strong><small>{status}</small></div></div>
     <div className="journey-airports">
       <div><b>{groundOnly?result.origin.code:journey.airport}</b><small>{groundOnly?result.origin.city:journey.flight?.airline??"Ground route"}</small></div>
       <div className="route-center"><span>{groundOnly?icon(journey.ground?.mode??""):alt?`${icon(journey.ground?.mode??"")} + ✈️`:"✈️"}</span><div className="route-line"/><small>{duration(journey.outboundTravelMinutes)} {groundOnly?"estimated": "travel + transfer"}</small></div>
       <div className="right"><b>{result.destination.code}</b><small>{result.destination.city}</small></div>
     </div>
     <div className="segments">
       {journey.ground&&<div className="segment"><span>{icon(journey.ground.mode)}</span><span><b>{journey.ground.mode.toUpperCase()} {groundOnly?"to destination":`to ${journey.airport}`}</b><small>{duration(journey.ground.durationMinutes)} · {journey.ground.costUSD===null?"fare unavailable":`${money(journey.ground.costUSD)} (${journey.ground.costType})`}</small></span></div>}
       {journey.flight&&<div className="segment"><span>✈️</span><span><b>{journey.flight.airline} · {journey.flight.from} → {journey.flight.to}</b><small>{journey.flight.departureLocal||"Time unknown"} · {duration(journey.flight.durationMinutes)} · {journey.flight.stops} stops · {money(journey.flight.priceUSD)}{journey.flight.roundTrip?" round-trip flight offer":" one-way flight offer"}</small></span></div>}
     </div>
     <div className="card-metrics"><span>Estimated arrival <b>{timestamp(journey.arrivalEpoch,result.destination.timeZone)}</b></span><span>{journey.savingsUSD!==null&&journey.savingsUSD>0?`Potential savings: ${money(journey.savingsUSD)}`:journey.savingsUSD!==null?`Vs original: ${money(journey.savingsUSD)}`:"Savings not established"}</span></div>
     {journey.issues.length>0&&<details className="warnings"><summary>Important booking and connection warnings ({journey.issues.length})</summary><ul>{journey.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul></details>}
     <div className="card-actions"><a href={journey.searchUrl} target="_blank" rel="noopener noreferrer" className="action-link">{groundOnly?"View Google Maps directions ↗":"Check flights on Google Flights ↗"}</a>{journey.ground&&!groundOnly&&<a href={journey.ground.url} target="_blank" rel="noopener noreferrer" className="text-link">Ground directions ↗</a>}</div>
   </div>
 </article>;
}
export default function MultimodalResults({data}:{data:SearchResponse}) {
 return <section aria-live="polite" className="results-area">
   <div className="results-heading"><div><span className="eyebrow">{data.source==="demo"?"SAMPLE DATA — NOT REAL FARES":"LIVE PROVIDER SEARCH · RECHECK BEFORE BOOKING"}</span><h2>Route comparisons</h2><p>{data.journeys.length} route options across {data.searchedAirports.length} searched airports</p></div>{data.baselineUSD!==null&&<div className="baseline">Original airport flight from <strong>{money(data.baselineUSD)}</strong></div>}</div>
   {data.narrative&&<div className="ai-panel"><div className="flex items-center gap-2"><span>✦</span><strong>Gemini route analysis</strong></div><p>{data.narrative}</p></div>}
   <div className="results-grid">{data.journeys.map((journey,index)=><JourneyCard journey={journey} index={index} result={data} key={`${journey.id}-${index}`}/>)}</div>
   {!data.journeys.length&&<div className="empty-state"><h3>No viable results with these filters</h3><p>Increase the budget or ground travel radius, change dates, or try a different departure airport.</p></div>}
   <section className="trace"><h3>Research agent activity</h3><div className="trace-rows">{data.agentSteps.map((step,i)=><div className="trace-row" key={i}><span className="dot"/><div><b>{step.name}</b><p>{step.detail}</p></div><span className="pill muted">{step.status}</span></div>)}</div></section>
   {data.warnings.length>0&&<aside className="global-warnings"><h3>Before you book</h3><ul>{data.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></aside>}
 </section>;
}
