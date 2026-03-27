import { buildSchema } from "@/lib/visualizer";
import { Dataset, ChatMessage } from "@/lib/types";

export async function POST(request: Request) {
  let body: {
    datasets: Dataset[];
    question?: string;
    history?: ChatMessage[];
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { datasets, question, history = [] } = body;

  if (!datasets || datasets.length === 0) {
    return Response.json({ error: "No datasets provided" }, { status: 400 });
  }

  // API key must live in .env.local — never sent to the client
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GOOGLE_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const schemas = datasets.map(buildSchema).join("\n\n");

  const systemInstruction = `You are an expert data analyst and BI assistant.
Given a dataset schema, return ONLY a valid JSON object with these exact keys:
- "insights": array of 3-5 specific, actionable business insights (strings)
- "sqlQueries": array of 2-3 objects each with "label" (short title) and "query" (valid SQL using the table name from the schema)
- "chartSuggestions": array of 2-3 strings describing useful visualizations

No markdown code fences. No text outside the JSON object.`;

  const userPrompt = question
    ? `Schema:\n${schemas}\n\nUser question: ${question}`
    : `Schema:\n${schemas}\n\nProvide a comprehensive analysis.`;

  // Build Gemini conversation history (exclude rows/rawRows for security + size)
  const historyContents = history.slice(-8).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [
            ...historyContents,
            { role: "user", parts: [{ text: userPrompt }] },
          ],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return Response.json(
        { error: `AI API error (${res.status})` },
        { status: 502 }
      );
      // Note: errText not forwarded to client to avoid leaking upstream details
      void errText;
    }

    const aiRes = await res.json();
    const rawText: string =
      aiRes?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    // Strip markdown fences
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/im, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { insights: [cleaned.slice(0, 500)], sqlQueries: [], chartSuggestions: [] };
    }

    // Validate and sanitise shape — never trust AI output blindly
    const safe = {
      insights: (Array.isArray(parsed.insights) ? parsed.insights : [])
        .filter((x): x is string => typeof x === "string")
        .slice(0, 8),
      sqlQueries: (Array.isArray(parsed.sqlQueries) ? parsed.sqlQueries : [])
        .filter(
          (x): x is { label: string; query: string } =>
            typeof x === "object" &&
            x !== null &&
            typeof (x as Record<string, unknown>).label === "string" &&
            typeof (x as Record<string, unknown>).query === "string"
        )
        .slice(0, 5),
      chartSuggestions: (
        Array.isArray(parsed.chartSuggestions) ? parsed.chartSuggestions : []
      )
        .filter((x): x is string => typeof x === "string")
        .slice(0, 5),
    };

    return Response.json(safe);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
