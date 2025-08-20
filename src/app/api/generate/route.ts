import { NextResponse, NextRequest } from "next/server";
import axios from "axios";

// Define request body type
interface GenerateRequestBody {
  prompt: string;
}

// Define response body type
interface GenerateResponseBody {
  reply: string;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = (await req.json()) as GenerateRequestBody;

    const response = await axios.post(
      "https://thedeba-debai.hf.space/generate",
      { text: prompt },
      { headers: { "Content-Type": "application/json" } }
    );

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

    const result: GenerateResponseBody = { reply: botReply };
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error(err);

    // Type guard for unknown error
    const message =
      err instanceof Error ? err.message : "❌ Error fetching response";

    return NextResponse.json({ reply: message }, { status: 500 });
  }
}
