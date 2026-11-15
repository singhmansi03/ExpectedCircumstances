"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AIRPORTS } from "../lib/airports";
import { shiftDate } from "../lib/time";
import MultimodalResults from "./components/MultimodalResults";
import ThemeToggle from "./components/ThemeToggle";
import AgentPanel from "./components/AgentPanel";
import type { Disruption, GroundMode, Priority, SearchMode, SearchResponse } from "../lib/types";

// Only ever called inside useEffect / event handlers, never during render.
// (Next.js 16 with cacheComponents errors if the current time is read during render.)
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const formatClock=()=>new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(new Date());
const MODES:Array<{code:GroundMode,label:string,icon:string}>=[{code:"bus",label:"Bus",icon:"🚌"},{code:"train",label:"Train",icon:"🚆"},{code:"drive",label:"Car",icon:"🚗"},{code:"rideshare",label:"Rideshare",icon:"🚕"}];
const labels={departure:"Departure airport or city",destination:"Destination airport or city"};

export default function Home() {
 const [origin,setOrigin]=useState("DSM");
 const [destination,setDestination]=useState("ICN");
 const [startAddress,setStartAddress]=useState("");
 const [todayStr,setTodayStr]=useState("");
 const [departureDate,setDepartureDate]=useState("");
 const [returnDate,setReturnDate]=useState("");
 const [roundTrip,setRoundTrip]=useState(true);
 const [mode,setMode]=useState<SearchMode>("standard");
 const [priority,setPriority]=useState<Priority>("cheapest");
 const [budget,setBudget]=useState("2000");
 const [flexibleDays,setFlexibleDays]=useState<0|1>(1);
 const [maxGroundMiles,setMaxGroundMiles]=useState("700");
 const [extraAirports,setExtraAirports]=useState("CVG");
 const [preferredModes,setPreferredModes]=useState<GroundMode[]>(["bus","train","drive","rideshare"]);
 const [disruption,setDisruption]=useState<Disruption>("none");
 const [originalFlightNumber,setOriginalFlightNumber]=useState("");
 const [demo,setDemo]=useState(true);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [data,setData]=useState<SearchResponse|null>(null);
 const [clock,setClock]=useState("");

 // Runs only in the browser after the page loads, so reading the time here is safe.
 useEffect(()=>{
   const t=today();
   setTodayStr(t);
   setDepartureDate(d=>d||shiftDate(t,7));
   setReturnDate(d=>d||shiftDate(t,14));
   setClock(formatClock());
   const id=setInterval(()=>setClock(formatClock()),30000);
   return()=>clearInterval(id);
 },[]);

 const inEmergency=mode==="emergency";
 function toggleGround(key:GroundMode){setPreferredModes(old=>old.includes(key)?old.filter(m=>m!==key):[...old,key]);}
 async function runSearch(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(loading)return;
  setLoading(true);setError("");setData(null);
  try {
   const response=await fetch("/api/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({origin,destination,startAddress,departureDate,returnDate:!inEmergency&&roundTrip?returnDate:undefined,budgetUSD:budget.trim()?Number(budget):null,mode,priority:inEmergency?"fastest":priority,flexibleDays:inEmergency?0:flexibleDays,maxGroundMiles:Number(maxGroundMiles),extraAirports,preferredModes,disruption:inEmergency?disruption:"none",originalFlightNumber:inEmergency?originalFlightNumber:"",demo})});
   const json:SearchResponse&{error?:string}=await response.json();
   if(!response.ok)throw new Error(json.error||"The search failed.");
   setData(json);
  } catch(e){setError(e instanceof Error?e.message:"Unable to complete search.");}
  finally{setLoading(false);}
 }
 return <main className="site-shell">
<header className="nav-bar"><div className="container nav-content"><div className="logo"><span className="logo-icon">↗</span><div><strong>Expected Circumstances</strong><small>Routes that make more sense</small></div></div><div className="nav-actions"><span className="beta">SMART ROUTE SEARCH · BETA</span><ThemeToggle /></div></div></header>
   <section className="hero"><div className="container hero-grid"><div><span className="eyebrow light">BEYOND JUST FLIGHTS</span><h1>Less money wasted.<br/><em>More ways to get there.</em></h1><p>Explore another departure airport, reach it by ground transport, and compare the full trip—not just the airfare.</p><div className="hero-chips"><span>✓ Alternative airports</span><span>✓ Flight + ground</span><span>✓ Emergency rerouting</span></div></div><div className="hero-stat"><span>ONE SEARCH. MULTIPLE POSSIBILITIES.</span><div className="route-preview"><span>DES MOINES</span><b>🚗 → ✈️</b><span>SEOUL</span></div><p>Compare price, total travel time, and connection risk.</p><small>Demo routes are illustrative, never live fare claims.</small></div></div></section>
   <div className="container workspace">
   <aside className="search-col"><form onSubmit={runSearch} className="search-panel">
     <div className="panel-header"><h2>Find your route</h2><p>Tell us where you need to go.</p></div>
     <div className="mode-picker"><button className={mode==="standard"?"mode-btn active":"mode-btn"} type="button" onClick={()=>setMode("standard")}>💸 Regular travel</button><button className={inEmergency?"mode-btn emergency active":"mode-btn emergency"} type="button" onClick={()=>{setMode("emergency");setPriority("fastest");setRoundTrip(false);}}>⚡ Travel urgently</button></div>
     {inEmergency&&<div className="urgent-note"><strong>Urgent rebooking mode</strong><p>Searches flights today and tomorrow and ranks options by earliest estimated arrival, including airport transfers. This is not an emergency-response service.</p><small>Current local time: {clock||"—"}</small></div>}
     <div className="form-fields">
       <label htmlFor="origin">{labels.departure}</label><input id="origin" list="airports" required value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="Des Moines or DSM"/>
       <label htmlFor="destination">{labels.destination}</label><input id="destination" list="airports" required value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Seoul or ICN"/>
       <datalist id="airports">{AIRPORTS.map(a=><option key={a.code} value={a.code}>{a.city} — {a.name}</option>)}</datalist>
       <label htmlFor="startAddress">Starting location for ground transfers <span className="optional">(optional)</span></label><input id="startAddress" value={startAddress} onChange={e=>setStartAddress(e.target.value)} placeholder="Address, hotel, or city; default: origin airport"/>
       {!inEmergency&&<><div className="field-row"><div><label htmlFor="date">Departure</label><input id="date" required type="date" min={todayStr||undefined} value={departureDate} onChange={e=>setDepartureDate(e.target.value)}/></div><div><label htmlFor="returnDate">{roundTrip?"Return":"Trip type"}</label>{roundTrip?<input id="returnDate" type="date" min={departureDate||todayStr||undefined} value={returnDate} onChange={e=>setReturnDate(e.target.value)}/>:<p className="inline-tag">One way</p>}</div></div>
       <label className="check-label"><input type="checkbox" checked={roundTrip} onChange={e=>setRoundTrip(e.target.checked)}/> Round-trip flight</label>
       <label className="check-label"><input type="checkbox" checked={flexibleDays===1} onChange={e=>setFlexibleDays(e.target.checked?1:0)}/> Flexible departure ±1 day</label></>}
       {inEmergency&&<><label htmlFor="disruption">What happened to your original flight?</label><select id="disruption" value={disruption} onChange={e=>setDisruption(e.target.value as Disruption)}><option value="none">No flight / I just need to leave</option><option value="delayed">Flight delayed</option><option value="cancelled">Flight cancelled</option><option value="missed_connection">Missed connection</option></select>{disruption!=="none"&&<><label htmlFor="flightNum">Original flight number <span className="optional">(optional, user-reported)</span></label><input id="flightNum" value={originalFlightNumber} onChange={e=>setOriginalFlightNumber(e.target.value)} placeholder="AA 1234"/></>}</>}
       <div className="section-divider"/>
       <label htmlFor="budget">Maximum total budget (USD)</label><div className="budget-input"><span>$</span><input id="budget" type="number" min="0" max="1000000" value={budget} onChange={e=>setBudget(e.target.value)} placeholder="Leave empty for no limit"/></div>
       {!inEmergency&&<><label>What matters more?</label><div className="priority-switch"><button type="button" className={priority==="cheapest"?"selected":""} onClick={()=>setPriority("cheapest")}>💰 Cheaper</button><button type="button" className={priority==="fastest"?"selected":""} onClick={()=>setPriority("fastest")}>⏱ Quicker</button></div></>}
       <label htmlFor="radius">Maximum alternative-airport range <b>{maxGroundMiles} miles</b></label><input id="radius" className="range" type="range" min="100" max="1200" step="50" value={maxGroundMiles} onChange={e=>setMaxGroundMiles(e.target.value)}/>
       <label htmlFor="alternates">Include specific airport codes <span className="optional">(optional)</span></label><input id="alternates" value={extraAirports} onChange={e=>setExtraAirports(e.target.value)} placeholder="e.g. CVG, ORD"/>
       <label>Ground transportation to compare</label><div className="transport-grid">{MODES.map(m=><label className={`transport-btn ${preferredModes.includes(m.code)?"selected":""}`} key={m.code}><input type="checkbox" checked={preferredModes.includes(m.code)} onChange={()=>toggleGround(m.code)}/><span>{m.icon}</span><b>{m.label}</b></label>)}</div>
       <label className="check-label demo-choice"><input type="checkbox" checked={demo} onChange={e=>setDemo(e.target.checked)}/> Use fictional demo data <span className="optional">(uncheck for SerpAPI live search)</span></label>
       <button className="submit-search" type="submit" disabled={loading||preferredModes.length===0}>{loading?"Researching connections…":inEmergency?"⚡ Find earliest arrival":"Find better journeys →"}</button>
       <p className="form-disclaimer">Exact tickets, live flight status, ground schedules, and availability must be confirmed with providers.</p>
     </div>
   </form></aside>
   <div className="main-col">
      <AgentPanel/>
      {error&&<div className="error-box" role="alert"><b>Search error</b><p>{error}</p></div>}
      {loading&&<div className="loading-panel" role="status"><div className="loader"/><h2>Researching your routes…</h2><p>Discovering airports, checking flight prices, estimating ground transfers, and validating departure windows.</p></div>}
      {data&&!loading&&<MultimodalResults data={data}/>}
      {!data&&!loading&&<div className="welcome-panel"><div className="welcome-icon">↗</div><span className="eyebrow">TRAVEL WITH OPTIONS</span><h2>A cheaper flight might be<br/><em>one airport away.</em></h2><p>Enter your route and explore whether a drive, bus, train, or rideshare connection could reduce your total cost—or get you there sooner.</p><div className="how-grid"><div><span>01</span><b>Enter your trip</b><small>Choose dates, budget and priority.</small></div><div><span>02</span><b>Research routes</b><small>Check airports, flight offers and ground travel.</small></div><div><span>03</span><b>Compare tradeoffs</b><small>See cost, time and booking risks together.</small></div></div><div className="example"><b>Try the example</b><p>DSM → ICN, with CVG as an alternative departure airport.</p><small>Enable demo mode to explore fictional sample prices without API keys.</small></div></div>}
   </div>
   </div>
   <footer className="footer"><div className="container"><span>Expected Circumstances · Travel research, not a booking service</span><span>© 2026 · Verify every connection before travel</span></div></footer>
 </main>;
}
