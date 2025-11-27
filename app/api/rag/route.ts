import { NextResponse } from "next/server";
import Exa from "exa-js";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const exa = new Exa(process.env.EXA_API_KEY!);
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query: string = body?.query ?? "";
    const history: Array<{ role: string; content: string }> = body?.messages ?? [];

    if (!query && (!history || history.length === 0)) {
      return NextResponse.json({ error: "No query or history provided" }, { status: 400 });
    }

    if (!process.env.PINECONE_INDEX) {
      return NextResponse.json(
        { error: "PINECONE_INDEX env var missing. Set PINECONE_INDEX to your index name." },
        { status: 500 }
      );
    }

    // 1) Get embeddings for query
    const embeddingResp = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });

    const vector = embeddingResp.data?.[0]?.embedding;
    if (!vector) {
      return NextResponse.json({ error: "Failed to create embedding" }, { status: 500 });
    }

    // 2) Query Pinecone
    const index = pinecone.index(process.env.PINECONE_INDEX);
    let pineRes: any = { matches: [] };
    try {
      pineRes = await index.query({
        vector,
        topK: 5,
        includeMetadata: true
      });
    } catch (err: any) {
      // If Pinecone call fails, continue but return note to LLM.
      console.warn("Pinecone query failed:", err?.message || err);
    }

    // Convert Pinecone matches -> bullets with blank lines between bullets
    const csvBullets = (pineRes.matches || [])
      .map((m: any) => {
        const md = m.metadata || {};
        // try to build compact line from common fields, fallback to JSON abbreviation
        const title = md.Chatbot_Name || md.name || md.title || "Item";
        const usecase = md.UseCase || md.usecase || md.Description || md.description || "";
        return `• **${title}** — ${usecase}`.trim();
      })
      .filter(Boolean)
      .join("\n\n");

    // 3) EXA web search for external context
    let exaBullets = "";
    try {
      const exaRes = await exa.searchAndContents(query, {
        numResults: 3,
        type: "neural",
        useAutoprompt: true
      });

      const exaList = (exaRes.results || []).map((r: any) => {
        const highlights = (r.highlights || []).map((h: any) => h.text).join(" | ");
        const snippet = highlights || (r.text ? String(r.text).slice(0, 240) : "");
        return `• ${snippet}`;
      });

      exaBullets = exaList.join("\n\n");
    } catch (err) {
      console.warn("EXA call failed:", err?.message || err);
    }

    // 4) Build LLM prompt (flexible, Godfather tone, option B)
    // Include chat history to provide memory
    const historyBlock = (history || [])
      .map((m) => `${m.role.toUpperCase()}: ${m.content.replace(/\n/g, " ")}`)
      .join("\n");

    const systemPrompt = `
You are BotFather — a helpful AI assistant that speaks with a calm, respectful, subtly authoritative "Godfather" tone.
Be warm, wise, and concise. Use natural language and keep your answers helpful and conversational.

Formatting rules (very important):
- Prefer natural conversational replies. Use bullet lists *only* when helpful.
- When you output bullet lists, put a blank line between every bullet (i.e. use "\\n\\n" between bullets).
- When you output paragraphs, separate paragraphs with a blank line (i.e. use "\\n\\n").
- If you include a GitHub-style Markdown table, ensure each cell is single-line (no internal line breaks) and keep rows short.
- If internal CSV or web bullets are provided below, consider them as factual references and use them when relevant.
- Do NOT compress multiple bullets into a single line or paragraph.
- Keep tone like an experienced advisor — calm, slightly poetic, never rude.

You will be given:
1) Conversation history for context (USER/ASSISTANT lines).
2) A CSV-knowledge section (internal bullets) and a WEB section (external bullets).
Use them as references — cite or rephrase the structured points when useful.
`;

    // Build the user prompt including CSV and WEB blocks (each bullet block uses double newline between items)
    const userPrompt = `
CONVERSATION HISTORY:
${historyBlock}

USER QUERY:
${query}

INTERNAL CSV REFERENCES (if any):
${csvBullets || "(none)"}

WEB REFERENCES (if any):
${exaBullets || "(none)"}

TASK:
Answer the user's question naturally and helpfully in a Godfather tone.
- Use CSV bullets when directly relevant; use web bullets when they add value.
- If presenting lists or comparisons, format them using Markdown (bullets or a table).
- Ensure there is a blank line between bullets and paragraphs.
- Keep output plain Markdown (no JSON). Return a clean conversational answer.
`;

    // 5) Call OpenAI chat completion with system + user
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 900
    });

    const assistantContent = completion.choices?.[0]?.message?.content || "";

    return NextResponse.json({ answer: assistantContent });
  } catch (err: any) {
    console.error("RAG route error:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
