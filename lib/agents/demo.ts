import { AIRPORT_BY_CODE, directionsUrl } from "../airports";
import { localDateToEpoch } from "../time";
import type { Airport, FlightOffer, GroundLeg, SearchRequest } from "../types";

function sampleFlight(from:Airport,to:Airport,date:string,price:number,duration:number,index:number,returnDate?:string):FlightOffer {
 const departureLocal=`${date} ${index===0?"11:30":"19:00"}`;
 const departureEpoch=localDateToEpoch(departureLocal,from.timeZone);
 return {id:`demo-${from.code}-${date}-${index}`,from:from.code,to:to.code,airline:index===0?"Illustrative Air":"Sample Airways",priceUSD:price,durationMinutes:duration,departureLocal,arrivalLocal:"Shown after live search",departureEpoch,arrivalEpoch:departureEpoch===null?null:departureEpoch+duration*60000,stops:index%2,roundTrip:Boolean(returnDate),departureDate:date,source:"demo"};
}
export function demoFlights(from:Airport,to:Airport,date:string,returnDate?:string):FlightOffer[] {
 const base=from.code==="DSM"?2500:from.code==="CVG"?1500:from.code==="ORD"?1700:from.code==="MCI"?1950:1900;
 return [sampleFlight(from,to,date,base,from.code==="DSM"?1000:900,0,returnDate),sampleFlight(from,to,date,Math.round(base*.92),1020,1,returnDate)];
}
export function demoGround(from:Airport,to:Airport):GroundLeg[] {
 const miles= from.code==="DSM"&&to.code==="CVG"?610:from.code==="DSM"&&to.code==="ORD"?330:130;
 return [
  {mode:"drive",durationMinutes:Math.round(miles/55*60),distanceMiles:miles,costUSD:Math.round(miles*.32),costType:"estimated",scheduleVerified:false,description:"Fictional self-driving cost for demo; no traffic or booking guarantee",source:"demo",url:directionsUrl(from,to,"drive")},
  {mode:"bus",durationMinutes:Math.round(miles/39*60)+90,distanceMiles:miles,costUSD:Math.round(miles*.17),costType:"estimated",scheduleVerified:false,description:"Fictional bus price and travel time; not a real ticket",source:"demo",url:directionsUrl(from,to,"transit")},
  {mode:"train",durationMinutes:Math.round(miles/45*60)+120,distanceMiles:miles,costUSD:null,costType:"unknown",scheduleVerified:false,description:"Illustrative train journey; fare unavailable",source:"demo",url:directionsUrl(from,to,"transit")},
 ];
}
export function demoAirports(origin:Airport,config:SearchRequest):Airport[] {
 const codes=origin.code==="DSM"?["ORD","MCI","OMA","CVG"]:["EWR","PHL","JFK","ORD"];
  return codes.filter(c=>c!==origin.code).map(c=>AIRPORT_BY_CODE.get(c)).filter((a):a is Airport=>Boolean(a));}
