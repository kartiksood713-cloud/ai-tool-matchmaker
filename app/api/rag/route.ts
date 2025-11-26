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
    const casual = ["hi", "hello", "hey", "yo", "hola", "sup"];
    if (casual.includes(query.toLowerCase().trim())) {
      return NextResponse.json({
        answer: "Hey 👋! How can the Botfather assist you today?"
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
    // 2. PINECONE → CLEAN BULLETS
    // -------------------------
    const pineRes = await index.query({
      vector: embedding.data[0].embedding,
      topK: 5,
      includeMetadata: true
    });

    const csvBullets = pineRes.matches
      .map((m: any) => {
        const md = m.metadata;
        return `
• **${md.Chatbot_Name || "Tool"}**  
  ${md.Description || md.UseCase || "Relevant internal knowledge."}
`;
      })
      .join("\n");

    // -------------------------
    // 3. EXA SEARCH → CLEAN BULLETS
    // -------------------------
    const exaRes = await exa.searchAndContents(query, {
      numResults: 3,
      type: "neural",
      useAutoprompt: true,
    });

    const exaBullets = exaRes.results
      .map((r: any) => {
        const highlights = r.highlights?.map((h: any) => h.text).join(" | ");
        const snippet = highlights || r.text?.slice(0, 250) || "";
        return `
• ${snippet}
`;
      })
      .join("\n");

    // -------------------------
    // 4. FINAL GPT ANSWER
    // -------------------------
    const llmPrompt = `
You are Botfather — a clean, classy, structured but conversational assistant.

RULES FOR ALL ANSWERS:
- NEVER output giant paragraphs.
- ALWAYS break EXA and CSV items into bullet points.
- ALWAYS leave a blank line between bullets.
- Main answer can be conversational.
- Use bullets only when needed.
- Only use CSV/EXA if relevant. Ignore if not helpful.

USER QUESTION:
"${query}"

-----------------------------------
PRIMARY INTERNAL DATA (CSV → bullets):
${csvBullets}

-----------------------------------
SECONDARY EXTERNAL DATA (EXA → bullets):
${exaBullets}

-----------------------------------
Now provide a clean, friendly, well-structured answer.
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
