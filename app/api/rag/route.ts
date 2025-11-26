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

    // -------------------------
    // 0. NATURAL CONVERSATION
    // -------------------------
    const greetings = ["hi", "hello", "hey", "yo", "hola", "sup"];
    if (greetings.includes(query.toLowerCase().trim())) {
      return NextResponse.json({
        answer: "Hey! 👋 How can I help you today?"
      });
    }

    const index = pinecone.index(process.env.PINECONE_INDEX!);

    // -------------------------
    // 1. EMBEDDING FOR PINECONE
    // -------------------------
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });

    // -------------------------
    // 2. PINECONE (CSV KNOWLEDGE)
    // -------------------------
    const pineRes = await index.query({
      vector: embedding.data[0].embedding,
      topK: 5,
      includeMetadata: true
    });

    // Convert CSV rows → natural bullet points
    const csvBullets = pineRes.matches.map((m: any) => {
      const md = m.metadata;
      return `• **${md.Chatbot_Name || "Tool"}** — ${md.Description || md.UseCase || "Relevant match from internal knowledge base."}`;
    }).join("\n");

    // -------------------------
    // 3. EXA SEARCH (OPTIONAL CONTEXT)
    // -------------------------
    const exaRes = await exa.searchAndContents(query, {
      numResults: 3,
      type: "neural",
      useAutoprompt: true,
    });

    const exaBullets = exaRes.results.map((r: any) => {
      const highlights = r.highlights?.map((h: any) => h.text).join(" | ");
      const snippet = highlights || r.text?.slice(0, 200) || "";
      return `• ${snippet}`;
    }).join("\n");

    // -------------------------
    // 4. FINAL GPT ANSWER (CONVERSATIONAL)
    // -------------------------
    const llmPrompt = `
You are a helpful business AI assistant.

USER QUESTION:
"${query}"

Here is relevant internal CSV knowledge (primary source):
${csvBullets}

Here are external web insights from EXA (secondary source):
${exaBullets}

TASK:
Provide a **clean, natural conversational answer** using BOTH sources when relevant.
- Use bullet points only when helpful.
- DO NOT force sections.
- DO NOT sound robotic.
- You can mix insights smoothly.
- If CSV data is irrelevant to the user's question, ignore it.
- If EXA is irrelevant, ignore it.
- Keep answers crisp, helpful, and human-like.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: llmPrompt }],
      temperature: 0.6
    });

    return NextResponse.json({
      answer: completion.choices[0].message?.content,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
