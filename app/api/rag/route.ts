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

    // =========================
    // 1) PINECONE VECTOR SEARCH
    // =========================
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });

    const pineRes = await index.query({
      vector: embedding.data[0].embedding,
      topK: 5,
      includeMetadata: true
    });

    const pineFormatted = pineRes.matches.map((m: any, i: number) => {
      const md = m.metadata;
      return `
${i + 1}. **${md.Chatbot_Name || "Tool"}**
- **Use Case:** ${md.UseCase || "N/A"}
- **Description:** ${md.Description || "N/A"}
- **Category:** ${md.Category || "N/A"}
- **Website:** ${md.Website || "N/A"}
`;
    }).join("\n");

    // =========================
    // 2) EXA SEARCH RESULTS
    // =========================
    const exaRes = await exa.searchAndContents(query, {
      numResults: 3,
      type: "neural",
      useAutoprompt: true
    });

    const exaFormatted = exaRes.results.map((r: any, i: number) => {
      const highlights = r.highlights?.map((h: any) => h.text).join(" | ") || "";
      return `
${i + 1}. **${r.title || "Web Result"}**
${highlights || r.text?.slice(0, 200) || ""}
${r.url ? `URL: ${r.url}` : ""}
`;
    }).join("\n");

    // =========================
    // 3) MAIN SUMMARY ANSWER
    // =========================
    const summaryPrompt = `
You are an expert business analyst.

USER QUESTION:
"${query}"

You must follow this EXACT format:

====================
SECTION 1 — CSV-Based Insights (Top Matches)
(You will NOT explain, only summarize insights from the CSV-Pinecone results.)

${pineFormatted}

====================
SECTION 2 — Main Answer (Dynamic, Topic-Aware)
Provide a clean, neutral, business-style explanation answering the user's question.
Do NOT mention Pinecone or EXA.
Do NOT mention metadata.
Write only a useful expert answer.

====================
SECTION 3 — Web Insights (EXA)
Summaries of the web search results (use bullet points or numbered points):

${exaFormatted}

====================

Now write the final response using this structure.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: summaryPrompt }]
    });

    return NextResponse.json({
      answer: completion.choices[0].message?.content
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
