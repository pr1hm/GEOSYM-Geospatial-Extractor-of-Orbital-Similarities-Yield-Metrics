import { NextRequest, NextResponse } from "next/server";
import { buildMissionBriefPrompt, generateSynthesizedFallbackBrief } from "@/lib/groqBriefGenerator";
import { PlanetaryTarget, AnalogScoreResult, MissionBriefResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target, result }: { target: PlanetaryTarget; result: AnalogScoreResult } = body;

    if (!target || !result) {
      return NextResponse.json(
        { error: "Missing required payload: target and result objects required." },
        { status: 400 }
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;

    // Check if GROQ_API_KEY is present and not just placeholder
    if (!groqApiKey || groqApiKey.includes("your_") || groqApiKey.trim() === "<>") {
      const fallbackBrief = generateSynthesizedFallbackBrief(target, result);
      return NextResponse.json({
        source: "synthesized_fallback",
        note: "Synthesized using NASA Systems Engineering protocol template (GROQ_API_KEY not configured).",
        brief: fallbackBrief,
      });
    }

    const prompt = buildMissionBriefPrompt(target, result);

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a Principal NASA Systems Engineer specializing in planetary surface exploration, analog field trials, and TRL advancement. Always respond with strict, valid JSON matching the requested schema."
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.warn("Groq API returned error status:", groqResponse.status, errText);
      const fallbackBrief = generateSynthesizedFallbackBrief(target, result);
      return NextResponse.json({
        source: "synthesized_fallback",
        note: `Groq upstream error (${groqResponse.status}). Used deterministic NASA protocol engine.`,
        brief: fallbackBrief,
      });
    }

    const completion = await groqResponse.json();
    const content = completion.choices?.[0]?.message?.content;
    const parsedBrief: MissionBriefResponse = JSON.parse(content);

    return NextResponse.json({
      source: "groq_llama_3.3_70b",
      brief: parsedBrief,
    });
  } catch (err: any) {
    console.error("Mission brief generation failed:", err);
    return NextResponse.json(
      { error: "Internal server error generating mission brief", details: err?.message },
      { status: 500 }
    );
  }
}

