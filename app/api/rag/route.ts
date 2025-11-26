import { NextResponse } from "next/server";
import Exa from "exa-js";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

// ----- Clients -----
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const exa = new Exa(process.env.EXA_API_KEY!);
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    const index = pinecone.index(process.env.PINECONE_INDEX!);

    // ------------------ 1. GET EXA CONTEXT ------------------
    const exaRes = await exa.searchAndContents(query, {
      type: "neural",
      useAutoprompt: true,
      numResults: 3,
    });

    const exaContexts = exaRes.results.map((r: any) => {
      let str = "";
      if (r.highlights) str += r.highlights.map((h: any) => h.text).join(" | ");
      if (r.text) str += " | " + r.text;
      return str;
    });

    // ------------------ 2. GET PINECONE CONTEXT ------------------
    const queryEmbedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const pineconeRes = await index.query({
      vector: queryEmbedding.data[0].embedding,
      topK: 5,
      includeMetadata: true,
    });

    const pineconeContexts = pineconeRes.matches.map((m: any) =>
      Object.entries(m.metadata)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ")
    );

    // ------------------ 3. BUILD RAG PROMPT ------------------
    const prompt = `
You are a business strategy assistant. Use ONLY the provided data.  

USER QUERY:
${query}

WEB DATA:
${exaContexts.join("\n")}

CSV DATA:
${pineconeContexts.join("\n")}

RESPONSE:
`;

    // ------------------ 4. GPT COMPLETION ------------------
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return NextResponse.json({ answer: completion.choices[0].message.content });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
