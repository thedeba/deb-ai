import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  try {
    const response = await axios.post(
      "https://thedeba-debai.hf.space/generate",
      { text: prompt }, // matches your old script
      { headers: { "Content-Type": "application/json" } }
    );

    // Hugging Face returns generated_text as JSON string
    let botReply = "⚠️ No response";
    const rawText = response.data?.generated_text;

    if (rawText) {
      try {
        const parsed = JSON.parse(rawText);
        botReply = parsed.response || JSON.stringify(parsed);
      } catch {
        botReply = rawText;
      }
    }

    return NextResponse.json({ reply: botReply });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ reply: "❌ Error fetching response" }, { status: 500 });
  }
}
