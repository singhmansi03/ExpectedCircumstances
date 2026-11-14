import type { Airport, FlightOffer, GroundLeg, Journey, SearchRequest, CostType } from "./types";

function classifyCost(ground:GroundLeg|null,roundTrip:boolean):CostType {
 if(!ground)return "quoted";
 if(ground.costUSD===null)return "unknown";
 if(roundTrip)return "estimated"; // Return transfer is assumed, not booked.
 return ground.costType;
}
function budgetCheck(cost:number|null,budget:number|null):boolean|null {
 if(cost===null)return null;
 return budget===null?true:cost<=budget;
}
export function makeJourneys(
 offers:FlightOffer[],ground:GroundLeg|null,origin:Airport,airport:Airport,
 config:SearchRequest,nowEpoch:number,baselineUSD:number|null
):Journey[] {
 const same=origin.code===airport.code;
 if(!same&&!ground)return [];
 const minCheckinMinutes= airport.code===config.destination?90:150;
 const departureBuffer=same?Math.max(90, minCheckinMinutes):minCheckinMinutes;
 return offers.flatMap((flight):Journey[]=>{
   const groundMinutes=ground?.durationMinutes??0;
   if(flight.departureEpoch!==null){
     const earliest=nowEpoch+(groundMinutes+departureBuffer)*60000;
     // For emergency, never surface already-departed or impossible-to-reach flights.
     // For normal mode this also filters past departures.
     if(flight.departureEpoch<earliest)return [];
   } else if(config.mode==="emergency"){
     // Missing trustworthy timezone/date: do not promise an emergency connection.
     return [];
   }
   const needsSchedule=Boolean(ground && !ground.scheduleVerified);
   const issues:string[]=[];
   if(ground){
     issues.push("Separate ground and air tickets: missed connections may not be protected.");
     if(needsSchedule)issues.push("Ground departure time/seat availability not verified; travel duration is only an estimate.");
     if(ground.costType==="unknown")issues.push("Ground fare unavailable: full trip cost and savings are unknown.");
     if(ground.costType==="estimated")issues.push("Ground cost is an illustrative estimate, not a bookable quote.");
   }
   if(flight.departureEpoch===null) issues.push("Flight departure timezone unavailable; connection cannot be timed precisely.");
   if(flight.roundTrip&&ground)issues.push("Return ground transfer cost is assumed similar; return timetable has not been verified.");
   if(config.disruption!=="none")issues.push("Disruption status is user-reported and not verified with an airline.");
   const expectedGroundCost=ground?.costUSD??(same?0:null);
   const total=expectedGroundCost===null?null:flight.priceUSD+expectedGroundCost*(flight.roundTrip&&ground?2:1);
   const costType=classifyCost(ground,flight.roundTrip);
   const outboundTravelMinutes=groundMinutes+(same?0:departureBuffer)+flight.durationMinutes;
   return [{
     id:`${flight.id}:${ground?.mode??"direct"}`,
     airport:airport.code,destination:flight.to,kind:same?"direct-airport":"alternate-airport",
     flight,ground,
     estimatedTotalUSD:total,costType,
     savingsUSD:total===null||baselineUSD===null?null:baselineUSD-total,
     outboundTravelMinutes,
     arrivalEpoch:flight.arrivalEpoch,
     departAirportEpoch:flight.departureEpoch,
     withinBudget:budgetCheck(total,config.budgetUSD),
     connectionStatus:(!ground&&flight.departureEpoch!==null)?"plausible":"unverified",
     issues,
     searchUrl:`https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${airport.code} to ${flight.to} on ${flight.departureDate}`)}`
   }];
 });
}
export function rankJourneys(routes:Journey[],config:SearchRequest,nowEpoch:number):Journey[] {
 const filtered=routes.filter(r=>r.withinBudget!==false);
 const sortBy=(a:Journey,b:Journey)=>{
   // Price mode: known priced journeys first, but estimates always tagged.
   if(config.priority==="cheapest"){
     if(a.estimatedTotalUSD===null)return 1;
     if(b.estimatedTotalUSD===null)return -1;
     return a.estimatedTotalUSD-b.estimatedTotalUSD || a.outboundTravelMinutes-b.outboundTravelMinutes;
   }
   // Fastest mode for emergencies: prioritize actual estimated arrival from NOW,
   // not simply airtime: a late-night flight can take longer door-to-door.
   if(config.mode==="emergency"){
     if(a.arrivalEpoch===null)return 1;
     if(b.arrivalEpoch===null)return -1;
     const am=a.arrivalEpoch-nowEpoch,bm=b.arrivalEpoch-nowEpoch;
     return am-bm || (a.estimatedTotalUSD??Infinity)-(b.estimatedTotalUSD??Infinity);
   }
   return a.outboundTravelMinutes-b.outboundTravelMinutes || (a.estimatedTotalUSD??Infinity)-(b.estimatedTotalUSD??Infinity);
 };
 return filtered.sort(sortBy).slice(0,35);
}

export function groundOnlyJourneys(ground:GroundLeg[],origin:Airport,to:Airport,config:SearchRequest,now:number,baselineUSD:number|null):Journey[] {
 return ground.map((leg):Journey=>{
  const total=leg.costUSD===null?null:leg.costUSD*(config.returnDate?2:1); const issues=["Ground schedules and seat availability have not been confirmed."];
  if(leg.costType==="estimated")issues.push("This is a cost estimate, not a bookable ticket or Uber quote.");
  if(total===null)issues.push("Ground fare missing: total cost is unknown.");
  if(config.returnDate)issues.push("Return ground cost assumes the same fare and the return timetable is unverified.");
  return {id:`ground-only-${leg.mode}`,airport:origin.code,destination:to.code,kind:"ground-only",flight:null,ground:leg,estimatedTotalUSD:total,costType:config.returnDate&&leg.costUSD!==null?"estimated":leg.costType,savingsUSD:total===null||baselineUSD===null?null:baselineUSD-total,outboundTravelMinutes:leg.durationMinutes,arrivalEpoch:now+leg.durationMinutes*60000,departAirportEpoch:null,withinBudget:budgetCheck(total,config.budgetUSD),connectionStatus:"unverified",issues,searchUrl:leg.url};
 });
}
