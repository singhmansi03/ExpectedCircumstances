
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, routes } = await req.json();

    if (
      typeof message !== "string" ||
      !Array.isArray(routes)
    ) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key missing" },
        { status: 500 }
      );
    }

    const prompt = `
      User's travel request:
      ${message}

      Available itineraries:
      ${JSON.stringify(routes)}

      You are an emergency travel assistant.

      Recommend the best feasible travel option.
      Compare costs and travel times.
      Explain why you chose it.

      Only use the provided itineraries.
      Never invent prices or departure times.
      Clearly identify estimated prices and
      missing information.
      Do not claim an itinerary is feasible
      unless it has been verified.
    `;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error("Gemini API error:", errorDetails);

      return NextResponse.json(
        { error: "Gemini API request failed" },
        { status: response.status }
      );
    }

    const result = await response.json();

    const answer = result.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("");

    if (!answer) {
      console.error("Unexpected Gemini response:", result);

      return NextResponse.json(
        { error: "Gemini returned no answer" },
        { status: 500 }
      );
    }

    return NextResponse.json({ answer });

  } catch (error) {
    console.error("Gemini error:", error);

    return NextResponse.json(
      { error: "Gemini request failed" },
      { status: 500 }
    );
  }
}
