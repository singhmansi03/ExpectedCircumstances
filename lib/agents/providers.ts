
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { AIRPORTS, AIRPORT_BY_CODE, haversineMiles, directionsUrl } from "../airports";
import { localDateToEpoch } from "../time";
import type { Airport, FlightOffer, GroundLeg, GroundMode } from "../types";
 
const SERP = "https://serpapi.com/search";
// Every SerpApi response is saved here so repeating a search costs 0 credits.
// Delete the .cache folder to force fresh prices.
const CACHE_DIR = path.join(process.cwd(), ".cache", "serp");
 
type JsonRecord = Record<string, unknown>;
function rec(v:unknown):JsonRecord {return typeof v==="object"&&v!==null&&!Array.isArray(v)?v as JsonRecord:{};}
function list(v:unknown):unknown[] {return Array.isArray(v)?v:[];}
function str(v:unknown):string {return typeof v==="string"?v:"";}
function num(v:unknown):number|null{return typeof v==="number"&&Number.isFinite(v)?v:null;}
 
export async function serpRequest(engine:string,params:Record<string,string>):Promise<JsonRecord> {
 const key=process.env.SERPAPI_KEY;
 if(!key) throw new Error("SERPAPI_KEY is missing. Enable demo mode or configure the key.");
 
 // Cache key is built WITHOUT the API key.
 const hash=createHash("sha1").update(engine+"|"+new URLSearchParams(params).toString()).digest("hex");
 const file=path.join(CACHE_DIR,`${engine}-${hash}.json`);
 try {
   const cached=JSON.parse(await fs.readFile(file,"utf8")) as JsonRecord;
   console.log(`[serp cache hit] ${engine}`);
   return cached;
 } catch {
   // Not cached yet: fall through to a real SerpApi call.
 }
 
 console.log(`[serp LIVE call - uses 1 credit] ${engine}`);
 const query=new URLSearchParams({...params,engine,api_key:key});
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
 try {
   const res=await fetch(`${SERP}?${query.toString()}`,{cache:"no-store",signal:controller.signal});
   const data=rec(await res.json());
   if(!res.ok||data.error)throw new Error(`SerpAPI ${engine}: ${str(data.error)||`HTTP ${res.status}`}`);
   // Writing can fail on read-only hosts like Vercel; that's fine, we just skip caching.
   await fs.mkdir(CACHE_DIR,{recursive:true}).catch(()=>{});
   await fs.writeFile(file,JSON.stringify(data)).catch(()=>{});
   return data;
 } finally {clearTimeout(timer);}
}
 
function airportMatchingText(a:Airport,text:string):boolean {
 const lower=text.toLowerCase();
 return Boolean(new RegExp(`(?:^|\\W)${a.code.toLowerCase()}(?:\\W|$)`).test(lower) || (a.name.toLowerCase()!==""&&lower.includes(a.name.toLowerCase())));
}
 
export async function discoverFromMaps(origin:Airport,radiusMiles:number):Promise<Airport[]> {
 const q=`airports near ${origin.city}`;
 const data=await serpRequest("google_maps",{type:"search",q,hl:"en"});
 const results=list(data.local_results);
 const discovered=new Set<string>();
 for (const item of results){
   const obj=rec(item);const text=`${str(obj.title)} ${str(obj.address)} ${str(obj.description)}`;
   const location=rec(obj.gps_coordinates);const lat=num(location.latitude);const lon=num(location.longitude);
   for(const airport of AIRPORTS){
     if(airport.code===origin.code)continue;
     if(!airportMatchingText(airport,text))continue;
     const computed=haversineMiles(origin,airport);
     const close= computed!==null?computed<=radiusMiles:(lat!==null&&lon!==null);
     if(close)discovered.add(airport.code);
   }
 }
 return [...discovered].map(code=>AIRPORT_BY_CODE.get(code)).filter((a):a is Airport=>Boolean(a));
}
 
export async function flightOffers(from:Airport,to:Airport,date:string,returnDate?:string):Promise<FlightOffer[]> {
 const params:Record<string,string>={departure_id:from.code,arrival_id:to.code,outbound_date:date,type:returnDate?"1":"2",currency:"USD",hl:"en",gl:"us"};
 if(returnDate)params.return_date=returnDate;
 const data=await serpRequest("google_flights",params);
 const all=[...list(data.best_flights),...list(data.other_flights)];
 return all.flatMap((value,index):FlightOffer[]=>{
    const f=rec(value); const price=num(f.price); const duration=num(f.total_duration);const segments=list(f.flights).map(rec);
    if(price===null||price<0||duration===null||duration<=0||!segments.length)return [];
    const first=rec(segments[0].departure_airport);const last=rec(segments.at(-1)?.arrival_airport);
    if(str(first.id).toUpperCase()!==from.code||str(last.id).toUpperCase()!==to.code)return [];
    const departureLocal=str(first.time);const arrivalLocal=str(last.time);
    const departureEpoch=localDateToEpoch(departureLocal,from.timeZone);
    const arrivalEpoch=departureEpoch===null?null:departureEpoch+duration*60000;
    return [{id:`${from.code}-${date}-${index}-${Math.round(price)}`,from:from.code,to:to.code,airline:str(segments[0].airline)||"Multiple airlines",priceUSD:price,durationMinutes:duration,departureLocal,arrivalLocal,departureEpoch,arrivalEpoch,stops:Math.max(0,segments.length-1),roundTrip:Boolean(returnDate),departureDate:date,source:"serpapi"}];
 });
}
 
function routeLink(from:Airport,to:Airport,mode:string,override?:string):string {
 if(!override)return directionsUrl(from,to,mode);
 const qs=new URLSearchParams({api:"1",origin:override,destination:`${to.name}, ${to.city}`,travelmode:mode==="drive"||mode==="rideshare"?"driving":"transit"});
 return `https://www.google.com/maps/dir/?${qs.toString()}`;
}
 
function transitMode(raw:JsonRecord):GroundMode {
 const trips=list(raw.trips).map(rec);
 const segmentModes=trips.map(t=>`${str(t.travel_mode)} ${str(t.title)}`.toLowerCase());
 const hasTrain=segmentModes.some(t=>/\b(train|rail|subway|metro|tram)\b/.test(t));
 const hasBus=segmentModes.some(t=>/\bbus\b/.test(t));
 return hasTrain&&!hasBus?"train":hasBus&&!hasTrain?"bus":"transit";
}
 
export async function groundOffers(from:Airport,to:Airport,requested:GroundMode[],startAddress?:string):Promise<GroundLeg[]> {
 const allowedTransit=requested.some(m=>["bus","train","transit"].includes(m));
 const allowedDrive=requested.includes("drive")||requested.includes("rideshare");
 const modes=[...(allowedDrive?["0"]:[]),...(allowedTransit?["3"]:[])];
 const result=await Promise.allSettled(modes.map(async mode=>{
   const data=await serpRequest("google_maps_directions",{start_addr:startAddress?.trim()||`${from.name}, ${from.city}`,end_addr:`${to.name}, ${to.city}`,travel_mode:mode,distance_unit:"1",hl:"en"});
   return {mode,rows:list(data.directions).map(rec)};
 }));
 const legs:GroundLeg[]=[];
 for(const r of result){
  if(r.status!=="fulfilled") continue;
  for(const route of r.value.rows){
   const travelMode=str(route.travel_mode).toLowerCase();
   if(r.value.mode==="0"&&!travelMode.includes("driv"))continue;
   if(r.value.mode==="3"&&!travelMode.includes("transit"))continue;
   const secs=num(route.duration);if(secs===null||secs<=0)continue;
   const distMeters=num(route.distance); const miles=distMeters===null?null:Math.round(distMeters/1609.344*10)/10;
   const durationMinutes=Math.ceil(secs/60);
   if(r.value.mode==="0"){
     if(requested.includes("drive"))legs.push({mode:"drive",durationMinutes,distanceMiles:miles,costUSD:miles===null?null:Math.round(miles*.32*100)/100,costType:miles===null?"unknown":"estimated",scheduleVerified:false,description:"Estimated self-driving fuel and operating cost ($0.32/mi); parking/tolls extra",source:"serpapi",url:routeLink(from,to,"drive",startAddress)});
     if(requested.includes("rideshare"))legs.push({mode:"rideshare",durationMinutes:durationMinutes+10,distanceMiles:miles,costUSD:miles===null?null:Math.round((8+miles*2.25)*100)/100,costType:miles===null?"unknown":"estimated",scheduleVerified:false,description:"Illustrative rideshare estimate ($8 + $2.25/mi), NOT an Uber quote or availability",source:"serpapi",url:routeLink(from,to,"rideshare",startAddress)});
   }else{
     const kind=transitMode(route);
     if(!requested.includes(kind) && !(kind==="transit" && allowedTransit))continue;
     const cost=num(route.cost);const currency=str(route.currency).toUpperCase();
     legs.push({mode:kind,durationMinutes,distanceMiles:miles,costUSD:cost!==null&&currency==="USD"?cost:null,costType:cost!==null&&currency==="USD"?"quoted":"unknown",scheduleVerified:false,description:`Maps transit itinerary; provider timetable and seat availability not verified${str(route.start_time)?` (shown departure ${str(route.start_time)})`:""}`,source:"serpapi",url:routeLink(from,to,"transit",startAddress)});
   }
  }
 }
 // Prefer shorter distinct itineraries while limiting result volume.
 return legs.sort((a,b)=>a.durationMinutes-b.durationMinutes).filter((v,i,arr)=>arr.findIndex(x=>x.mode===v.mode)===i).slice(0,5);
}
 