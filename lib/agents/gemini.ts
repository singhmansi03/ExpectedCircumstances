import type { Journey, SearchRequest } from "../types";
export async function explainJourneys(routes:Journey[],request:SearchRequest):Promise<string|null> {
 const key=process.env.GEMINI_API_KEY;
 if(!key||routes.length===0)return null;
 const slim=routes.slice(0,5).map(r=>({airport:r.airport,transport:r.ground?.mode??"flight only",flight:r.flight?{airline:r.flight.airline,departure:r.flight.departureLocal,price:r.flight.priceUSD}:null,cost:r.estimatedTotalUSD,costType:r.costType,minutes:r.outboundTravelMinutes,arrivalEpoch:r.arrivalEpoch,status:r.connectionStatus,issues:r.issues}));
 const prompt=[
 "You explain multimodal travel results as a cautious travel advisor, not a booking agent.",
 "Use ONLY the supplied JSON. Do NOT invent pricing, departure time, seats, airport transfers, flight disruption status, or airport locations.",
 "Unknown costs are UNKNOWN; estimates are not ticket quotes. No itinerary is guaranteed. Ground-transit schedules are unverified.",
 "For emergencies, compare estimated arrival times from now and urge independently verifying flights and transfers before purchase.",
 "Give 3-5 short sentences, highlighting the tradeoff and risks. Do not claim any flight is confirmed, or that a reported cancellation was verified.",
 JSON.stringify({priority:request.priority,mode:request.mode,disruption:request.disruption,originalFlightNumber:request.originalFlightNumber||null,options:slim})
 ].join("\n");
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
 try{
  const res=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.15,maxOutputTokens:350}}),signal:controller.signal,cache:"no-store"});
  if(!res.ok)return null;
  const data=await res.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>};
  return data.candidates?.[0]?.content?.parts?.map(p=>p.text??"").join("").trim()||null;
 }catch{return null;}finally{clearTimeout(timer);}
}