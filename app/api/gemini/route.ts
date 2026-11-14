
// import { NextResponse } from "next/server";

// export async function POST(req: Request) {
//   try {
//     const { message, routes } = await req.json();

//     if (
//       typeof message !== "string" ||
//       !Array.isArray(routes)
//     ) {
//       return NextResponse.json(
//         { error: "Invalid request" },
//         { status: 400 }
//       );
//     }

//     const apiKey = process.env.GEMINI_API_KEY;

//     if (!apiKey) {
//       return NextResponse.json(
//         { error: "Gemini API key missing" },
//         { status: 500 }
//       );
//     }

//     const prompt = `
//       User's travel request:
//       ${message}

//       Available itineraries:
//       ${JSON.stringify(routes)}

//       You are an emergency travel assistant.

//       Recommend the best feasible travel option.
//       Compare costs and travel times.
//       Explain why you chose it.

//       Only use the provided itineraries.
//       Never invent prices or departure times.
//       Clearly identify estimated prices and
//       missing information.
//       Do not claim an itinerary is feasible
//       unless it has been verified.
//     `;

//     const response = await fetch(
//       "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "x-goog-api-key": apiKey,
//         },
//         body: JSON.stringify({
//           contents: [
//             {
//               parts: [{ text: prompt }],
//             },
//           ],
//         }),
//       }
//     );

//     if (!response.ok) {
//       const errorDetails = await response.text();
//       console.error("Gemini API error:", errorDetails);

//       return NextResponse.json(
//         { error: "Gemini API request failed" },
//         { status: response.status }
//       );
//     }

//     const result = await response.json();

//     const answer = result.candidates?.[0]?.content?.parts
//       ?.map((part: { text?: string }) => part.text ?? "")
//       .join("");

//     if (!answer) {
//       console.error("Unexpected Gemini response:", result);

//       return NextResponse.json(
//         { error: "Gemini returned no answer" },
//         { status: 500 }
//       );
//     }

//     return NextResponse.json({ answer });

//   } catch (error) {
//     console.error("Gemini error:", error);

//     return NextResponse.json(
//       { error: "Gemini request failed" },
//       { status: 500 }
//     );
//   }
// }

// Legacy explanation API retained from the original project.
// New UI invokes grounded Gemini within POST /api/search.
import { NextResponse } from "next/server";
export async function POST(req:Request) {
 try{
  const body=await req.json() as {message?:unknown;routes?:unknown};
  if(typeof body.message!=="string"||body.message.length>1500||!Array.isArray(body.routes)||body.routes.length>15)return NextResponse.json({error:"Invalid message or routes"},{status:400});
  if(!process.env.GEMINI_API_KEY)return NextResponse.json({error:"Gemini API key missing"},{status:503});
  const prompt=`Summarize only these route records. Never invent prices, dates, seats, or verified flight status. Label any unknown cost or connection as unverified.\nUser note: ${body.message}\nRoutes: ${JSON.stringify(body.routes).slice(0,10000)}`;
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.1,maxOutputTokens:300}}),cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:"Gemini request failed"},{status:502});
  const result=await response.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>};
  const answer=result.candidates?.[0]?.content?.parts?.map(x=>x.text||"").join("").trim();
  return answer?NextResponse.json({answer}):NextResponse.json({error:"Empty Gemini response"},{status:502});
 }catch{return NextResponse.json({error:"Could not generate explanation"},{status:502});}
}
