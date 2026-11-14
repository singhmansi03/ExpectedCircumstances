// Google Flights returns local wall-clock timestamps. Convert only when the airport IANA time zone is known.
// Iteration accounts for daylight-saving offsets without assuming the server's time zone.
export function localDateToEpoch(local: string, timeZone: string | null): number | null {
 if(!timeZone) return null;
 const m=/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(local);
 if(!m) return null;
 const [year,month,day,hour,minute]=m.slice(1).map(Number);
 const expected=Date.UTC(year,month-1,day,hour,minute);
 if(!Number.isFinite(expected)) return null;
 let epoch=expected;
 try {
   const fmt=new Intl.DateTimeFormat("en-US",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
   for(let i=0;i<3;i++) {
     const parts=Object.fromEntries(fmt.formatToParts(new Date(epoch)).map(p=>[p.type,p.value]));
     const wall=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute);
     epoch+=expected-wall;
   }
   return epoch;
 }catch{return null;}
}
export function localToday(timeZone:string|null,now=new Date()):string {
 const fmt=new Intl.DateTimeFormat("en-CA",{timeZone:timeZone??"UTC",year:"numeric",month:"2-digit",day:"2-digit"});
 const p=Object.fromEntries(fmt.formatToParts(now).map(part=>[part.type,part.value]));
 return `${p.year}-${p.month}-${p.day}`;
}
export function shiftDate(date:string,days:number):string {
 const d=new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
}
export function isoDateValid(date:string):boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 const d=new Date(`${date}T12:00:00Z`);return !Number.isNaN(d.getTime())&&d.toISOString().startsWith(date);
}