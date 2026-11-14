import { AIRPORT_BY_CODE, haversineMiles, nearbyAirports, resolveAirport } from "../airports";
import { isoDateValid, localToday, shiftDate } from "../time";
import { groundOnlyJourneys, makeJourneys, rankJourneys } from "../optimizer";
import { demoAirports, demoFlights, demoGround } from "./demo";
import { discoverFromMaps, flightOffers, groundOffers } from "./providers";
import { explainJourneys } from "./gemini";
import { planAirportResearch } from "./planner";
import type { AgentStep, Airport, FlightOffer, GroundLeg, Journey, SearchRequest, SearchResponse } from "../types";

const MODES=new Set(["drive","bus","train","transit","rideshare"]);
export function parseRequest(value:unknown):SearchRequest {
 if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Request must be an object.");
 const v=value as Record<string,unknown>;
 const origin=String(v.origin??"").trim(),destination=String(v.destination??"").trim();
 if(origin.length>90||destination.length>90||!resolveAirport(origin)||!resolveAirport(destination))throw new Error("Enter supported airport codes (e.g. DSM, ICN) or recognized city names.");
 if(resolveAirport(origin)?.code===resolveAirport(destination)?.code)throw new Error("Origin and destination must differ.");
 const mode=v.mode==="emergency"?"emergency":"standard";
 const departureDate=String(v.departureDate??"");
 if(mode==="standard"&&!isoDateValid(departureDate))throw new Error("Choose a valid departure date.");
 const returnDate=v.returnDate?String(v.returnDate):undefined;
 if(returnDate&&(!isoDateValid(returnDate)||returnDate<departureDate))throw new Error("Return date must be after the departure date.");
 const budgetUSD=v.budgetUSD===null||v.budgetUSD===""||v.budgetUSD===undefined?null:Number(v.budgetUSD);
 if(budgetUSD!==null&&(!Number.isFinite(budgetUSD)||budgetUSD<0||budgetUSD>1000000))throw new Error("Budget must be a positive USD amount or blank.");
 const priority=v.priority==="fastest"?"fastest":"cheapest";
 const d=String(v.disruption??"none");
 const disruption=(["none","delayed","cancelled","missed_connection"].includes(d)?d:"none") as SearchRequest["disruption"];
 const maxGroundMiles=Math.min(1200,Math.max(50,Number(v.maxGroundMiles)||650));
 const flexibleDays=v.flexibleDays===1?1:0;
 const preferredModes=Array.isArray(v.preferredModes)?v.preferredModes.filter(x=>typeof x==="string"&&MODES.has(x)):[];
 const extraAirports=String(v.extraAirports??"").toUpperCase().split(/[\s,;]+/).filter(x=>/^[A-Z]{3}$/.test(x)).slice(0,4);
 return {origin,destination,departureDate,returnDate:mode==="emergency"?undefined:returnDate,mode,priority:mode==="emergency"?"fastest":priority,disruption,originalFlightNumber:String(v.originalFlightNumber??"").slice(0,20),startAddress:String(v.startAddress??"").slice(0,140),budgetUSD,flexibleDays:mode==="emergency"?0:flexibleDays,maxGroundMiles,preferredModes:preferredModes.length?preferredModes:["drive","bus","train","rideshare"],extraAirports,demo:v.demo===true};
}
async function concurrent<T,R>(values:T[],limit:number,fn:(item:T)=>Promise<R>):Promise<PromiseSettledResult<R>[]> {
 const out:Array<PromiseSettledResult<R>>=new Array(values.length);
 let index=0;
 await Promise.all(Array.from({length:Math.min(limit,values.length)},async()=>{
   while(index<values.length){const i=index++;try{out[i]={status:"fulfilled",value:await fn(values[i])};}catch(error){out[i]={status:"rejected",reason:error};}}
 }));
 return out;
}
function codeAirport(code:string):Airport|null {return AIRPORT_BY_CODE.get(code)||resolveAirport(code);}
function selectAlternativeAirports(origin:Airport,requested:SearchRequest,fromMaps:Airport[]):Airport[] {
 const candidates=new Map<string,Airport>();
 for(const a of nearbyAirports(origin,requested.maxGroundMiles,30))candidates.set(a.code,a);
 for(const a of fromMaps)candidates.set(a.code,a);
 for(const code of requested.extraAirports){const a=codeAirport(code);if(a&&a.code!==origin.code)candidates.set(a.code,a);}
 const hubs=new Set(["ORD","MSP","CVG","MCI","ATL","DFW","DEN","SFO","LAX","EWR","JFK","SEA","IAD","PHL","LHR","FRA"]);
 const selected=[...candidates.values()].filter(a=>a.code!==origin.code&&a.latitude!==null&&origin.latitude!==null)
  .sort((a,b)=>{
   const distA=haversineMiles(origin,a)??999999,distB=haversineMiles(origin,b)??999999;
   // Small proximity bonus for international hubs, but don't disregard shorter transfers.
   const scoreA=distA-(hubs.has(a.code)?130:0),scoreB=distB-(hubs.has(b.code)?130:0);
   return scoreA-scoreB;
  });
 // Explicitly requested alternates are prioritized and may be farther than radius.
 const explicit=requested.extraAirports.map(code=>codeAirport(code)).filter((a):a is Airport=>a!==null&&a.code!==origin.code);
 return [...new Map([...explicit,...selected].map(a=>[a.code,a])).values()].slice(0,requested.flexibleDays===1?4:5);
}
function dateList(origin:Airport,req:SearchRequest,now:number):Array<{date:string,returnDate?:string}> {
 if(req.mode==="emergency"){
   const today=localToday(origin.timeZone,new Date(now));
   return [today,shiftDate(today,1)].map(date=>({date}));
 }
 return (req.flexibleDays===1?[-1,0,1]:[0]).map(n=>({date:shiftDate(req.departureDate,n),returnDate:req.returnDate?shiftDate(req.returnDate,n):undefined})).filter(item=>item.date>=localToday(origin.timeZone,new Date(now)));
}
export async function researchTrips(req:SearchRequest,now=Date.now()):Promise<SearchResponse> {
 const origin=resolveAirport(req.origin)!,dest=resolveAirport(req.destination)!;
 const steps:AgentStep[]=[],warnings:string[]=[];
 const dates=dateList(origin,req,now);
 if(!dates.length)throw new Error("Travel dates are in the past at your departure location.");
 if(req.disruption!=="none")warnings.push(`Your flight disruption (${req.disruption.replace("_"," ")}${req.originalFlightNumber?`, ${req.originalFlightNumber}`:""}) is self-reported. This app does not verify live flight status.`);
 if(req.mode==="emergency")warnings.push("Urgent travel searches today and tomorrow. Always confirm that departure, airline check-in, security and ground transfers are still possible.");
 let mapCandidates:Airport[]=[];
 if(!req.demo){
  try {mapCandidates=await discoverFromMaps(origin,req.maxGroundMiles);steps.push({name:"Airport discovery agent",status:"completed",detail:`Google Maps airport search found ${mapCandidates.length} code-resolved candidates; expanded with nearby catalog airports.`});}
  catch{warnings.push("Google Maps airport discovery unavailable; using known airport catalog and user-entered codes.");steps.push({name:"Airport discovery agent",status:"partial",detail:"Used local IATA airport catalog after Maps discovery failed."});}
 } else {steps.push({name:"Airport discovery agent",status:"completed",detail:"Demo catalog; all prices and schedules are fictional."});}
 let selected=req.demo?demoAirports(origin,req):selectAlternativeAirports(origin,req,mapCandidates);
 if(!req.demo && process.env.GEMINI_API_KEY && selected.length>1){
   const proposed=await planAirportResearch(origin,dest,req,selected,Math.min(4,selected.length));
   if(proposed?.length){
     const reorder=new Map(selected.map(a=>[a.code,a]));
     const explicit=req.extraAirports.map(code=>reorder.get(code)).filter((x):x is Airport=>Boolean(x));
     selected=[...new Map([...explicit,...proposed.map(code=>reorder.get(code)).filter((x):x is Airport=>Boolean(x)),...selected].map(a=>[a.code,a])).values()].slice(0,req.flexibleDays===1?4:5);
     steps.push({name:"Gemini airport research planner",status:"completed",detail:"Prioritized candidate airports from a validated IATA shortlist; it did not invent flights or fares."});
   }else steps.push({name:"Gemini airport research planner",status:"skipped",detail:"Used deterministic proximity ordering; no reliable AI shortlist returned."});
 }else steps.push({name:"Gemini airport research planner",status:"skipped",detail:req.demo?"Not needed in fictional demo mode.":"Optional: add GEMINI_API_KEY to enable AI-guided candidate research."});
 const airports=[origin,...selected];
 const combos=airports.flatMap(airport=>dates.map(day=>({airport,...day})));
 const flightFindings=await concurrent(combos,8,async item=>({airport:item.airport,flights:req.demo?demoFlights(item.airport,dest,item.date,item.returnDate):await flightOffers(item.airport,dest,item.date,item.returnDate)}));
 const flightMap=new Map<string,FlightOffer[]>();let flightErrors=0;
 for(const result of flightFindings){
  if(result.status==="rejected"){flightErrors++;continue;}
  const old=flightMap.get(result.value.airport.code)||[];
  flightMap.set(result.value.airport.code,[...old,...result.value.flights]);
 }
 if(flightErrors)warnings.push(`${flightErrors} of ${combos.length} flight searches failed; results are incomplete.`);
 steps.push({name:"Flight search agent",status:flightErrors?"partial":"completed",detail:`Scanned ${combos.length} airport/date combinations using ${req.demo?"fictional":"SerpAPI Google Flights"} offers.`});
 const baselineFlights=flightMap.get(origin.code)||[];
 const baselineUSD=baselineFlights.length?Math.min(...baselineFlights.map(x=>x.priceUSD)):null;
 if(baselineUSD===null)warnings.push("No baseline flight fare from the original airport was found; savings cannot be calculated.");
 const reachable=selected.filter(a=>(flightMap.get(a.code)||[]).length>0);
 const groundFindings=await concurrent(reachable,5,async airport=>({airport,legs:req.demo?demoGround(origin,airport):await groundOffers(origin,airport,req.preferredModes,req.startAddress)}));
 const groundMap=new Map<string,GroundLeg[]>();let groundErrors=0;
 for(const r of groundFindings){if(r.status==="rejected"){groundErrors++;continue;}groundMap.set(r.value.airport.code,r.value.legs);}
 if(groundErrors)warnings.push(`${groundErrors} alternative-airport ground searches failed.`);
 steps.push({name:"Ground transfer agent",status:groundErrors?"partial":"completed",detail:`Checked transit and driving to ${reachable.length} airport(s); rideshare prices are estimates, not Uber offers.`});
 let journeys:Journey[]=[];
 journeys.push(...makeJourneys(baselineFlights,null,origin,origin,req,now,baselineUSD));
 for(const airport of reachable){
  const flights=flightMap.get(airport.code)||[];
  for(const leg of groundMap.get(airport.code)||[]){
   if(!req.preferredModes.includes(leg.mode)&&!(leg.mode==="transit"&&req.preferredModes.some(m=>m==="bus"||m==="train")))continue;
   journeys.push(...makeJourneys(flights,leg,origin,airport,req,now,baselineUSD));
  }
 }
 // For reachable domestic city pairs, ground-only can beat any flight in an emergency.
 const miles=haversineMiles(origin,dest);
 if(miles!==null && miles<=req.maxGroundMiles){
   try{
    const directGround=req.demo?demoGround(origin,dest):await groundOffers(origin,dest,req.preferredModes,req.startAddress);
    journeys.push(...groundOnlyJourneys(directGround,origin,dest,req,now,baselineUSD));
   }catch{warnings.push("Direct ground transportation search failed.");}
 }
 journeys=rankJourneys(journeys,req,now);
 if(!journeys.length)warnings.push("No options fit the current filters or safe connection buffers. Try raising your budget, increasing your radius, or choosing another date.");
 if(journeys.some(j=>j.costType==="unknown"))warnings.push("Some results have unknown ground fares. They cannot be treated as fully priced journeys.");
 if(req.returnDate)warnings.push("Round-trip flight prices are search offers; returning from an alternate airport requires another ground transfer and a separate schedule check.");
 steps.push({name:"Connection and budget agent",status:"completed",detail:`Ranked ${journeys.length} remaining option(s) after minimum check-in buffers and budget filtering. All separate-ticket connections require verification.`});
 const narrative=req.demo?null:await explainJourneys(journeys,req);
 steps.push({name:"Gemini explanation agent",status:narrative?"completed":"skipped",detail:narrative?"Summarized only the researched options.":"Optional: configure GEMINI_API_KEY for grounded summaries."});
 return {source:req.demo?"demo":"live",searchedAt:new Date(now).toISOString(),origin,destination:dest,journeys,baselineUSD,warnings,agentSteps:steps,narrative,searchedAirports:airports.map(x=>x.code)};
}