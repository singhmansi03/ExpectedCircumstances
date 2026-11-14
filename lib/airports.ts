import type { Airport } from "./types";

// Explicit, expandable IATA catalog; never infer an IATA code from a Maps business title.
// Map searches can discover airports, but only code-resolved airports are queried for tickets.
const seed: Array<[string, string, string, number, number, string]> = [
  ["DSM","Des Moines International Airport","Des Moines, IA",41.534,-93.663,"America/Chicago"],
  ["CID","Eastern Iowa Airport","Cedar Rapids, IA",41.885,-91.710,"America/Chicago"],
  ["OMA","Eppley Airfield","Omaha, NE",41.303,-95.894,"America/Chicago"],
  ["MCI","Kansas City International Airport","Kansas City, MO",39.297,-94.714,"America/Chicago"],
  ["MSP","Minneapolis Saint Paul International Airport","Minneapolis, MN",44.882,-93.222,"America/Chicago"],
  ["ORD","O'Hare International Airport","Chicago, IL",41.974,-87.907,"America/Chicago"],
  ["MDW","Midway International Airport","Chicago, IL",41.786,-87.752,"America/Chicago"],
  ["STL","St. Louis Lambert International Airport","St. Louis, MO",38.748,-90.370,"America/Chicago"],
  ["CVG","Cincinnati Northern Kentucky International Airport","Cincinnati, OH",39.049,-84.668,"America/New_York"],
  ["IND","Indianapolis International Airport","Indianapolis, IN",39.717,-86.294,"America/Indiana/Indianapolis"],
  ["MKE","Milwaukee Mitchell International Airport","Milwaukee, WI",42.947,-87.897,"America/Chicago"],
  ["DTW","Detroit Metropolitan Airport","Detroit, MI",42.216,-83.356,"America/Detroit"],
  ["CLE","Cleveland Hopkins International Airport","Cleveland, OH",41.412,-81.850,"America/New_York"],
  ["CMH","John Glenn Columbus International Airport","Columbus, OH",39.998,-82.891,"America/New_York"],
  ["PIT","Pittsburgh International Airport","Pittsburgh, PA",40.492,-80.233,"America/New_York"],
  ["JFK","John F Kennedy International Airport","New York, NY",40.641,-73.779,"America/New_York"],
  ["LGA","LaGuardia Airport","New York, NY",40.777,-73.873,"America/New_York"],
  ["EWR","Newark Liberty International Airport","Newark, NJ",40.689,-74.174,"America/New_York"],
  ["PHL","Philadelphia International Airport","Philadelphia, PA",39.874,-75.243,"America/New_York"],
  ["BOS","Boston Logan International Airport","Boston, MA",42.366,-71.010,"America/New_York"],
  ["BWI","Baltimore Washington International Airport","Baltimore, MD",39.175,-76.668,"America/New_York"],
  ["DCA","Reagan National Airport","Washington, DC",38.852,-77.040,"America/New_York"],
  ["IAD","Washington Dulles International Airport","Washington, DC",38.953,-77.456,"America/New_York"],
  ["ATL","Hartsfield Jackson Atlanta International Airport","Atlanta, GA",33.640,-84.427,"America/New_York"],
  ["CLT","Charlotte Douglas International Airport","Charlotte, NC",35.214,-80.943,"America/New_York"],
  ["RDU","Raleigh Durham International Airport","Raleigh, NC",35.877,-78.787,"America/New_York"],
  ["MIA","Miami International Airport","Miami, FL",25.796,-80.290,"America/New_York"],
  ["FLL","Fort Lauderdale Hollywood International Airport","Fort Lauderdale, FL",26.073,-80.153,"America/New_York"],
  ["MCO","Orlando International Airport","Orlando, FL",28.431,-81.308,"America/New_York"],
  ["TPA","Tampa International Airport","Tampa, FL",27.975,-82.533,"America/New_York"],
  ["DFW","Dallas Fort Worth International Airport","Dallas, TX",32.899,-97.040,"America/Chicago"],
  ["DAL","Dallas Love Field","Dallas, TX",32.847,-96.852,"America/Chicago"],
  ["IAH","George Bush Intercontinental Airport","Houston, TX",29.990,-95.336,"America/Chicago"],
  ["HOU","William P Hobby Airport","Houston, TX",29.646,-95.278,"America/Chicago"],
  ["AUS","Austin Bergstrom International Airport","Austin, TX",30.197,-97.666,"America/Chicago"],
  ["SAT","San Antonio International Airport","San Antonio, TX",29.534,-98.470,"America/Chicago"],
  ["DEN","Denver International Airport","Denver, CO",39.856,-104.674,"America/Denver"],
  ["COS","Colorado Springs Airport","Colorado Springs, CO",38.806,-104.700,"America/Denver"],
  ["SLC","Salt Lake City International Airport","Salt Lake City, UT",40.789,-111.979,"America/Denver"],
  ["PHX","Phoenix Sky Harbor International Airport","Phoenix, AZ",33.434,-112.012,"America/Phoenix"],
  ["LAS","Harry Reid International Airport","Las Vegas, NV",36.085,-115.153,"America/Los_Angeles"],
  ["LAX","Los Angeles International Airport","Los Angeles, CA",33.942,-118.408,"America/Los_Angeles"],
  ["BUR","Hollywood Burbank Airport","Burbank, CA",34.201,-118.359,"America/Los_Angeles"],
  ["ONT","Ontario International Airport","Ontario, CA",34.056,-117.601,"America/Los_Angeles"],
  ["SNA","John Wayne Airport","Santa Ana, CA",33.676,-117.868,"America/Los_Angeles"],
  ["SAN","San Diego International Airport","San Diego, CA",32.733,-117.190,"America/Los_Angeles"],
  ["SFO","San Francisco International Airport","San Francisco, CA",37.621,-122.379,"America/Los_Angeles"],
  ["OAK","Oakland International Airport","Oakland, CA",37.721,-122.221,"America/Los_Angeles"],
  ["SJC","San Jose Mineta International Airport","San Jose, CA",37.363,-121.929,"America/Los_Angeles"],
  ["SMF","Sacramento International Airport","Sacramento, CA",38.696,-121.591,"America/Los_Angeles"],
  ["SEA","Seattle Tacoma International Airport","Seattle, WA",47.449,-122.309,"America/Los_Angeles"],
  ["PAE","Paine Field","Everett, WA",47.906,-122.281,"America/Los_Angeles"],
  ["PDX","Portland International Airport","Portland, OR",45.589,-122.595,"America/Los_Angeles"],
  ["ICN","Incheon International Airport","Seoul, South Korea",37.460,126.440,"Asia/Seoul"],
  ["GMP","Gimpo International Airport","Seoul, South Korea",37.559,126.791,"Asia/Seoul"],
  ["PUS","Gimhae International Airport","Busan, South Korea",35.180,128.938,"Asia/Seoul"],
  ["NRT","Narita International Airport","Tokyo, Japan",35.772,140.393,"Asia/Tokyo"],
  ["HND","Haneda Airport","Tokyo, Japan",35.550,139.779,"Asia/Tokyo"],
  ["LHR","London Heathrow Airport","London, UK",51.470,-0.454,"Europe/London"],
  ["LGW","London Gatwick Airport","London, UK",51.153,-0.182,"Europe/London"],
  ["CDG","Paris Charles de Gaulle Airport","Paris, France",49.010,2.547,"Europe/Paris"],
  ["ORY","Paris Orly Airport","Paris, France",48.727,2.365,"Europe/Paris"],
  ["FRA","Frankfurt Airport","Frankfurt, Germany",50.037,8.562,"Europe/Berlin"],
  ["AMS","Amsterdam Schiphol Airport","Amsterdam, Netherlands",52.310,4.768,"Europe/Amsterdam"],
  ["DEL","Indira Gandhi International Airport","Delhi, India",28.556,77.100,"Asia/Kolkata"],
  ["BOM","Chhatrapati Shivaji Maharaj International Airport","Mumbai, India",19.090,72.866,"Asia/Kolkata"],
  ["DXB","Dubai International Airport","Dubai, UAE",25.253,55.366,"Asia/Dubai"],
  ["YYZ","Toronto Pearson International Airport","Toronto, Canada",43.677,-79.624,"America/Toronto"],
  ["YVR","Vancouver International Airport","Vancouver, Canada",49.195,-123.184,"America/Vancouver"],
];
export const AIRPORTS: Airport[] = seed.map(([code, name, city, latitude, longitude, timeZone]) => ({ code, name, city, latitude, longitude, timeZone }));
export const AIRPORT_BY_CODE = new Map(AIRPORTS.map((airport) => [airport.code, airport]));
const aliases: Record<string,string> = {"korea":"ICN","south korea":"ICN","seoul":"ICN","des moines":"DSM","new york":"JFK","nyc":"JFK","chicago":"ORD","los angeles":"LAX","san francisco":"SFO","tokyo":"HND","london":"LHR","cincinnati":"CVG","delhi":"DEL","india":"DEL","paris":"CDG","boston":"BOS"};
export function resolveAirport(value: string): Airport | null {
 const q=value.trim().toLowerCase(); if(!q) return null;
 const code=value.trim().toUpperCase(); const direct=AIRPORT_BY_CODE.get(code); if(direct) return direct;
 if(aliases[q]) return AIRPORT_BY_CODE.get(aliases[q]) ?? null;
 const cityToken=q.split(",")[0].trim();
 const match=AIRPORTS.find(a=>a.city.toLowerCase()===q || a.name.toLowerCase()===q || a.city.toLowerCase().split(",")[0]===cityToken);
 if(match) return match;
 if(/^[A-Z]{3}$/.test(code)) return {code,name:`${code} Airport`,city:code,latitude:null,longitude:null,timeZone:null};
 return null;
}
export function haversineMiles(a:Airport,b:Airport):number|null {
 if(a.latitude===null||a.longitude===null||b.latitude===null||b.longitude===null) return null;
 const r=Math.PI/180,dLat=(b.latitude-a.latitude)*r,dLon=(b.longitude-a.longitude)*r;
 const s=Math.sin(dLat/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(dLon/2)**2;
 return 3958.8*2*Math.asin(Math.sqrt(s));
}
export function nearbyAirports(origin:Airport,maxMiles:number,limit=8):Airport[] {
 return AIRPORTS.map(a=>({a,d:haversineMiles(origin,a)})).filter(x=>x.a.code!==origin.code && x.d!==null && x.d <= maxMiles).sort((a,b)=>(a.d??0)-(b.d??0)).slice(0,limit).map(x=>x.a);
}
export function directionsUrl(origin:Airport,destination:Airport,mode:string) {
 const params=new URLSearchParams({api:"1",origin:origin.name+" "+origin.city,destination:destination.name+" "+destination.city,travelmode:mode==="drive"||mode==="rideshare"?"driving":"transit"});
 return `https://www.google.com/maps/dir/?${params.toString()}`;
}
