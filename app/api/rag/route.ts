import { NextResponse } from "next/server";
import Exa from "exa-js";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const exa = new Exa(process.env.EXA_API_KEY!);
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export async function POST(req: Request) {
  try {
    const { query, messages = [] } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "No query provided" }, { status: 400 });
    }

    const index = pinecone.index(process.env.PINECONE_INDEX!);

    // -------------------------
    // 1. EMBEDDING FOR PINECONE
    // -------------------------
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    // -------------------------
    // 2. PINECONE CONTEXT
    // -------------------------
    const pineRes = await index.query({
      vector: embedding.data[0].embedding,
      topK: 5,
      includeMetadata: true,
    });

    const csvContext = pineRes.matches
      .map((m: any) => {
        const md = m.metadata;
        return `• **${md.Chatbot_Name || "Tool"}** — ${md.Description || md.UseCase || ""}`;
      })
      .join("\n\n"); // <-- blank lines between bullets

    // -------------------------
    // 3. EXA CONTEXT
    // -------------------------
    const exaRes = await exa.searchAndContents(query, {
      numResults: 3,
      type: "neural",
      useAutoprompt: true,
    });

    const exaContext = exaRes.results
      .map((r: any) => {
        const snippet =
          r.highlights?.map((h: any) => h.text).join(" | ") ||
          r.text?.slice(0, 200) ||
          "";
        return `• ${snippet}`;
      })
      .join("\n\n"); // <-- blank lines between bullets

    // -------------------------
    // 4. SYSTEM PROMPT (THE MAGIC FIX)
    // -------------------------

    const systemPrompt = `
You are **The BotFather** — calm, wise, slow, intimidatingly respectful.
Speak like Vito Corleone. Never over-the-top. Never caricature. Just controlled power.

Your formatting rules MUST ALWAYS be followed:

1. **Bullets must always have a blank line between each bullet.**  
2. **Paragraphs must also have a blank line between them.**  
3. No giant blocks of text.  
4. Keep each sentence short and spaced out.  
5. Use Markdown formatting cleanly.  
6. NEVER remove blank lines between bullets or paragraphs.  
7. NEVER clump everything into one paragraph.  
8. NEVER output markdown tables unless explicitly asked.

Memory:
- You MUST use the previous messages provided (the \`messages\` array) to give context-aware answers.
- Respond naturally based on conversation history.

Tone:
- Polite.
- Slow.
- Measured.
- Every reply feels like “BotFather giving advice”.

Now use the CSV context **only if relevant**:
${csvContext}

Use EXA insights **only if relevant**:
${exaContext}
`;

    // -------------------------
    // 5. LLM CALL WITH MEMORY
    // -------------------------
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
        { role: "user", content: query },
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
