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

    // ---------- EXA ----------
    const exaRes = await exa.searchAndContents(query, {
      numResults: 3,
      type: "neural",
      useAutoprompt: true,
    });

    const exaCtx = exaRes.results.map((r: any) => {
      const highlights = r.highlights?.map((h: any) => h.text).join(" | ") || "";
      return `${highlights} ${r.text || ""}`;
    });

    // ---------- Pinecone ----------
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });

    const pineRes = await index.query({
      vector: embedding.data[0].embedding,
      topK: 5,
      includeMetadata: true
    });

    const pineCtx = pineRes.matches.map((m: any) =>
      Object.entries(m.metadata)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ")
    );

    const prompt = `
USER QUERY:
${query}

WEB SEARCH RESULTS:
${exaCtx.join("\n")}

CSV KNOWLEDGE:
${pineCtx.join("\n")}

Give a clean, short, actionable answer.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }]
    });

    return NextResponse.json({ answer: completion.choices[0].message?.content });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
