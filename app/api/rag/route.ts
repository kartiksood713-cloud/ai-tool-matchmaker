import { NextResponse } from "next/server";
import Exa from "exa-js";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const exa = new Exa(process.env.EXA_API_KEY!);
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export async function POST(req: Request) {
  try {
    const { query, history } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "No query provided" }, { status: 400 });
    }

    const casual = ["hi", "hello", "hey", "yo", "hola", "sup"];

    // Natural greetings (still godfather-style)
    if (casual.includes(query.toLowerCase().trim())) {
      return NextResponse.json({
        answer:
          "My friend… you come to me with a greeting, and I welcome you. Tell me… what favor can the BotFather do for you today?"
      });
    }

    const index = pinecone.index(process.env.PINECONE_INDEX!);

    // -------------------------
    // Embedding
    // -------------------------
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });

    // -------------------------
    // Pinecone → Bullets
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
    // EXA → Bullets
    // -------------------------
    const exaRes = await exa.searchAndContents(query, {
      numResults: 3,
      type: "neural",
      useAutoprompt: true
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
    // Build conversation history
    // -------------------------
    const formattedHistory = (history || [])
      .map((msg: any) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");

    // -------------------------
    // LLM PROMPT (Godfather tone + line breaks)
    // -------------------------
    const llmPrompt = `
You are **The BotFather**, inspired by *The Godfather*.
Tone:
- Calm, slow, respectful
- Slightly intimidating but kind
- “I’m doing you a favor” attitude
- No cringe slang
- Wise, strategic, authoritative

FORMATTING RULES:
- Bullets must have **blank lines** between them.
- Paragraphs must always start on a **new line**.
- Never output a giant block of text.
- Always separate sections with clear spacing.

CONVERSATION HISTORY:
${formattedHistory}

USER QUESTION:
"${query}"

INTERNAL DATA (CSV):
${csvBullets}

EXTERNAL DATA (EXA):
${exaBullets}

Now reply as The BotFather, with perfect spacing and bullet formatting.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: llmPrompt }],
      temperature: 0.6
    });

    return NextResponse.json({
      answer: completion.choices[0].message?.content
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
