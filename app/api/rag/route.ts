import { NextResponse } from "next/server";
import Exa from "exa-js";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const exa = new Exa(process.env.EXA_API_KEY!);
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export async function POST(req: Request) {
  try {
    const { query, messages } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "No query provided" }, { status: 400 });
    }

    const index = pinecone.index(process.env.PINECONE_INDEX!);

    // -------------------------
    // Embeddings for Pinecone
    // -------------------------
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    // -------------------------
    // Pinecone CSV Knowledge
    // -------------------------
    const pineRes = await index.query({
      vector: embedding.data[0].embedding,
      topK: 5,
      includeMetadata: true,
    });

    const csvBullets = pineRes.matches
      .map((m: any) => {
        const md = m.metadata;
        return `• **${md.Chatbot_Name || "Tool"}** — ${md.UseCase || md.Description || "Relevant match"}`;
      })
      .join("\n\n"); // <--- IMPORTANT FOR STREAMDOWN GAP SPACING

    // -------------------------
    // EXA Search
    // -------------------------
    const exaRes = await exa.searchAndContents(query, {
      numResults: 3,
      type: "neural",
      useAutoprompt: true,
    });

    const exaBullets = exaRes.results
      .map((r: any) => {
        const highlights = r.highlights?.map((h: any) => h.text).join(" | ");
        const snippet = highlights || r.text?.slice(0, 200) || "";
        return `• ${snippet}`;
      })
      .join("\n\n");

    // -------------------------
    // LLM Prompt (Godfather Tone)
    // -------------------------
    const llmPrompt = `
You are **The BotFather** — speak like Vito Corleone.

Tone Rules:
- Slow, calm, commanding.
- Occasional Godfather-style lines: “my child…”, “listen carefully…”, “I will give you an answer you cannot refuse.”
- Never comedic or parody — classy, intimidating respect.

Formatting Rules (IMPORTANT for StreamDown):
- Always output clean Markdown.
- Bullet points MUST have a blank line between them.
- Paragraphs MUST be separated by a blank line.
- Do not clump text.
- No walls of text.

User question:
"${query}"

Relevant internal knowledge:
${csvBullets}

Relevant external insights:
${exaBullets}

Consolidate everything into one answer.
Only include details that truly matter.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        ...(messages || []).map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: llmPrompt },
      ],
      temperature: 0.6,
    });

    return NextResponse.json({
      answer: completion.choices[0].message?.content,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
