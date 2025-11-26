import { NextResponse } from "next/server";
import Exa from "exa-js";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const exa = new Exa(process.env.EXA_API_KEY!);
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "No query provided" }, { status: 400 });
    }

    const index = pinecone.index(process.env.PINECONE_INDEX!);

    // ---------- OPENAI EMBEDDING ----------
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });

    // ---------- PINECONE (CSV Retrieval) ----------
    const pineRes = await index.query({
      vector: embedding.data[0].embedding,
      topK: 8,
      includeMetadata: true
    });

    // CSV rows reconstructed as NATURAL LANGUAGE SENTENCES
    const csvChunks = pineRes.matches.map((m: any) => {
      const meta = m.metadata || {};
      return Object.entries(meta)
        .map(([k, v]) => `${k.replaceAll("_", " ")}: ${v}`)
        .join(". ");
    });

    // ---------- EXA ----------
    const exaRes = await exa.searchAndContents(query, {
      numResults: 3,
      type: "neural",
      useAutoprompt: true,
    });

    const exaChunks = exaRes.results.map((r: any) => {
      const highlights = r.highlights?.map((h: any) => h.text).join(" | ") || "";
      return `${highlights}. ${r.text || ""}`;
    });

    // ---------- HYBRID PROMPT ----------
    const prompt = `
You are an AI assistant that MUST combine BOTH:
1. Internal structured CSV knowledge (FIRST PRIORITY)
2. Web research context (SECONDARY)

Respond with **accurate**, **practical**, **clean**, and **well-structured** answers.

USER QUERY:
${query}

CSV (INTERNAL BUSINESS KNOWLEDGE):
${csvChunks.join("\n\n")}

WEB (SUPPLEMENTAL EXTERNAL CONTEXT):
${exaChunks.join("\n\n")}

Now provide the final answer using BOTH sources.
Do NOT hallucinate. Use CSV as the primary source.
If the CSV contains a tool name, description, use-case, or category — it MUST appear in the answer.
`;

    // ---------- FINAL LLM COMPLETION ----------
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4
    });

    return NextResponse.json({ answer: completion.choices[0].message?.content });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
