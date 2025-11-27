import { NextResponse } from "next/server";
import Exa from "exa-js";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const exa = new Exa(process.env.EXA_API_KEY!);
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export async function POST(req) {
  try {
    const { query, history = [] } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "No query provided" }, { status: 400 });
    }

    // Pinecone
    const index = pinecone.index(process.env.PINECONE_INDEX!);

    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });

    const pineRes = await index.query({
      vector: embedding.data[0].embedding,
      topK: 5,
      includeMetadata: true
    });

    // CSV → bullets
    const csvBullets = pineRes.matches
      .map((m) => {
        const md = m.metadata;
        return `• **${md.Chatbot_Name || "Tool"}** — ${md.Description || md.UseCase || ""}`;
      })
      .join("\n\n");

    // EXA → bullets
    const exaRes = await exa.searchAndContents(query, {
      numResults: 3,
      type: "neural",
      useAutoprompt: true
    });

    const exaBullets = exaRes.results
      .map((r) => {
        const highlights = r.highlights?.map((h) => h.text).join(" | ");
        return `• ${highlights || r.text?.slice(0, 180)}`;
      })
      .join("\n\n");

    // FINAL prompt with memory + spacing
    const llmPrompt = `
You are The BotFather — respond in a calm, wise, Godfather tone.
Remember the conversation.

CONVERSATION SO FAR:
${history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

USER ASKS:
"${query}"

CSV KNOWLEDGE (use only if relevant):
${csvBullets}

WEB INSIGHTS (optional):
${exaBullets}

RULES:
- If listing items, ALWAYS put an empty line between bullets.
- Keep answers neat, spaced, and easy to read.
- Maintain Godfather persona subtly.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: llmPrompt }],
      temperature: 0.6
    });

    return NextResponse.json({
      answer: completion.choices[0].message?.content
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
