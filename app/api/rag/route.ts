import { NextResponse } from "next/server";
import Exa from "exa-js";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

// --------------------------------------------------
// INIT
// --------------------------------------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const exa = new Exa(process.env.EXA_API_KEY!);
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export async function POST(req: Request) {
  console.log("🔥 Incoming RAG request...");

  try {
    const { query, messages } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "No query provided" }, { status: 400 });
    }

    // --------------------------------------------------
    // 1. Create embedding for Pinecone
    // --------------------------------------------------
    const embed = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const index = pinecone.index(process.env.PINECONE_INDEX!);

    const pine = await index.query({
  vector: embed.data[0].embedding,
  topK: 5,
  includeMetadata: true,
});

   const csvBullets = pine.matches
  .map((m: any) => {
    const md = m.metadata || {};

    const name =
      md.Chatbot_Name ||
      md.name ||
      md.tool_name ||
      md.Tool ||
      "Tool";

    const desc =
      md.UseCase ||
      md.use_case ||
      md.Description ||
      md.description ||
      md.summary ||
      "Relevant";

    return `• ${name} — ${desc}`;
  })
  .join("\n\n");


    // --------------------------------------------------
    // 2. EXA Search
    // --------------------------------------------------
    const exaRes = await exa.searchAndContents(query, {
      numResults: 3,
      type: "neural",
      useAutoprompt: true,
    });

    const exaBullets = exaRes.results
      .map((r: any) => {
        const hi = r.highlights?.map((h: any) => h.text).join(" | ");
        return `• ${hi || r.text?.slice(0, 200) || ""}`;
      })
      .join("\n\n");

    // --------------------------------------------------
    // 3. SYSTEM PROMPT (Godfather + formatting rules)
    // --------------------------------------------------
    const systemPrompt = `
You are The BotFather. Speak in a calm, slow, powerful Godfather tone.
Never comedic. Never exaggerated. Always elegant.

Do NOT use:
- bold
- italics
- asterisks
- markdown lists
- hyphen bullets

FORMAT RULES:
- Plain text only.
- Numbered list only.
- Each item spaced by exactly one blank line.
- Each description indented exactly 3 spaces.
- Short, clean, elegant responses.
- No walls of text.
- No limiting number of tools.
- Always conversational — respond directly to the user's message, then list tools.

STRUCTURE:

Intro (1–2 lines addressing the user)
(blank line)

Here are the tools that match your request:
(blank line)

1. Tool Name
   Short description.

2. Tool Name
   Short description.

(blank line)
End with a calm Godfather-style closing line.

USER MESSAGE:
"${query}"

INTERNAL KNOWLEDGE:
${csvBullets}

EXTERNAL INSIGHTS:
${exaBullets}
`;

    // --------------------------------------------------
    // 4. CONVERSATIONAL CHAT COMPLETION (FIXED)
    // --------------------------------------------------
const completion = await openai.chat.completions.create({
  model: "gpt-4.1-mini",
  messages: [
    { role: "system", content: systemPrompt },
    ...((messages || []).map(m => ({
      role: m.role,
      content: m.content
    }))),
    { role: "user", content: query }
  ],
  temperature: 0.6,
});

    return NextResponse.json({
      answer: completion.choices[0].message?.content,
    });
  } catch (err: any) {
    console.error("❌ RAG ERROR:", err);

    return NextResponse.json(
      {
        answer:
          "My child… the system is troubled. But stay calm, for I will return with an answer you cannot refuse.",
      },
      { status: 500 }
    );
  }
}
