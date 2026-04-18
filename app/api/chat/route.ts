import { NextResponse } from "next/server";

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "sk_oti4gry4_9uL6CVb4b8pLWEdrPCH0GTpU";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const payload = {
      model: "sarvam-30b", // using 'sarvam-30b' as it is a valid model along with sarvam-m and sarvam-105b
      messages: [
        { 
          role: "system", 
          content: "You are Pulse Bot, a helpful AI assistant for the Market Pulse dashboard. Provide concise, helpful insights about stocks, markets, and financial data. Be precise and clear." 
        },
        ...messages
      ],
      temperature: 0.5,
    };

    const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SARVAM_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sarvam API error:", errorText);
      // Fallback fallback if sarvam-105b fails, maybe it expects a different model identifier or structure.
      return NextResponse.json({ error: "Failed to generate AI response: " + errorText }, { status: response.status });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
