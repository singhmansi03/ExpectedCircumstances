
// import { NextRequest, NextResponse } from "next/server";

// const airports: Record<string, string> = {
//   DSM: "Des Moines International Airport, Iowa, USA",
//   OMA: "Eppley Airfield, Omaha, Nebraska, USA",
//   MCI: "Kansas City International Airport, Missouri, USA",
//   CID: "Eastern Iowa Airport, Cedar Rapids, Iowa, USA",
//   JFK: "John F Kennedy International Airport, New York, USA",
//   EWR: "Newark Liberty International Airport, New Jersey, USA",
//   LGA: "LaGuardia Airport, New York, USA",
//   PHL: "Philadelphia International Airport, Pennsylvania, USA",
//   LAX: "Los Angeles International Airport, California, USA",
//   BUR: "Hollywood Burbank Airport, California, USA",
//   ONT: "Ontario International Airport, California, USA",
//   SNA: "John Wayne Airport, California, USA",
// };

// type Direction = {
//   travel_mode?: string;
//   duration?: number;
//   distance?: number;
//   cost?: number;
//   currency?: string;
//   start_time?: string;
//   end_time?: string;
// };

// export async function GET(req: NextRequest) {
//   const from = req.nextUrl.searchParams
//     .get("from")?.toUpperCase();

//   const to = req.nextUrl.searchParams
//     .get("to")?.toUpperCase();

//   const mode = req.nextUrl.searchParams
//     .get("mode")?.toUpperCase() || "TRANSIT";

//   if (
//     !from ||
//     !to ||
//     !airports[from] ||
//     !airports[to] ||
//     !["TRANSIT", "DRIVE"].includes(mode)
//   ) {
//     return NextResponse.json(
//       { error: "Invalid airport or travel mode" },
//       { status: 400 }
//     );
//   }

//   const apiKey = process.env.SERPAPI_KEY;

//   if (!apiKey) {
//     return NextResponse.json(
//       { error: "SERPAPI_KEY missing" },
//       { status: 500 }
//     );
//   }

//   try {
//     const params = new URLSearchParams({
//       engine: "google_maps_directions",
//       start_addr: airports[from],
//       end_addr: airports[to],
//       travel_mode: mode === "TRANSIT" ? "3" : "0",
//       distance_unit: "1",
//       api_key: apiKey,
//     });

//     const response = await fetch(
//       `https://serpapi.com/search.json?${params.toString()}`,
//       { cache: "no-store" }
//     );

//     const data = await response.json();

//     if (!response.ok || data.error) {
//       return NextResponse.json(
//         {
//           error: "Ground route search failed",
//           details: data.error || "Provider error",
//         },
//         { status: 502 }
//       );
//     }

//     const directions: Direction[] = data.directions || [];

//     const routes = directions
//       .filter((route) => {
//         return route.travel_mode?.toLowerCase() ===
//           (mode === "TRANSIT" ? "transit" : "driving");
//       })
//       .map((route) => ({
//         durationMinutes:
//           typeof route.duration === "number"
//             ? Math.ceil(route.duration / 60)
//             : null,

//         distanceMiles:
//           typeof route.distance === "number"
//             ? Math.round(route.distance / 1609.344)
//             : null,

//         fareUSD:
//           route.currency === "USD" &&
//           typeof route.cost === "number"
//             ? route.cost
//             : null,

//         startTime: route.start_time || null,
//         endTime: route.end_time || null,
//       }));

//     if (routes.length === 0) {
//       return NextResponse.json({
//         from,
//         to,
//         mode,
//         available: false,
//         routes: [],
//       });
//     }

//     const best = routes[0];

//     return NextResponse.json({
//       from,
//       to,
//       mode,
//       available: true,
//       durationMinutes: best.durationMinutes,
//       distanceMiles: best.distanceMiles,
//       fareUSD: best.fareUSD,
//       fareKnown: best.fareUSD !== null,
//       startTime: best.startTime,
//       endTime: best.endTime,
//       routes,
//       note:
//         mode === "DRIVE"
//           ? "Driving duration only; vehicle costs are not included."
//           : "Transit schedule and fare must be verified before booking.",
//     });
//   } catch (error) {
//     console.error(error);

//     return NextResponse.json(
//       { error: "Could not retrieve ground routes" },
//       { status: 500 }
//     );
//   }
// }

// Compatibility endpoint from the original app; new UI uses the coordinated search API.
import { NextRequest, NextResponse } from "next/server";
import { resolveAirport } from "../../../lib/airports";
import { groundOffers } from "../../../lib/agents/providers";
export async function GET(req:NextRequest) {
 const p=req.nextUrl.searchParams,from=resolveAirport(p.get("from")||""),to=resolveAirport(p.get("to")||"");
 const mode=p.get("mode")?.toUpperCase()||"TRANSIT";
 if(!from||!to||!["TRANSIT","DRIVE"].includes(mode))return NextResponse.json({error:"Invalid route request"},{status:400});
 try{
  const ground=await groundOffers(from,to,mode==="DRIVE"?["drive"]:["bus","train","transit"]);
  if(!ground.length)return NextResponse.json({from:from.code,to:to.code,mode,available:false,routes:[]});
  const best=ground[0];return NextResponse.json({from:from.code,to:to.code,mode,available:true,durationMinutes:best.durationMinutes,distanceMiles:best.distanceMiles,fareUSD:best.costUSD,fareKnown:best.costType==="quoted",startTime:null,endTime:null,routes:ground,note:best.description});
 }catch{return NextResponse.json({error:"Ground route provider unavailable"},{status:502});}
}
