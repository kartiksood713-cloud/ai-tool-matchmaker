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

    // ---------- EMBEDDING ----------
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });

    // ---------- PINECONE QUERY ----------
    const pineRes = await index.query({
      vector: embedding.data[0].embedding,
      topK: 10,
      includeMetadata: true
    });

    // Extract CSV rows
    const csvRows = pineRes.matches.map((m: any) => m.metadata);

    // Convert CSV rows to Markdown table
    let table = "";
    if (csvRows.length > 0) {
      const columns = Object.keys(csvRows[0]);

      const header = `| # | ${columns.join(" | ")} |`;
      const separator = `|---|${columns.map(() => "---").join("|")}|`;
      const rows = csvRows
        .map((row: any, i: number) => {
          const vals = columns.map((col) => row[col] || "");
          return `| ${i + 1} | ${vals.join(" | ")} |`;
        })
        .join("\n");

      table = `${header}\n${separator}\n${rows}`;
    }

    // ---------- EXA QUERY ----------
    const exaRes = await exa.searchAndContents(query, {
      numResults: 3,
      type: "neural",
      useAutoprompt: true,
    });

    const exaText = exaRes.results
      .map((r: any) => {
        const highlights = r.highlights?.map((h: any) => h.text).join(" | ") || "";
        return `• ${highlights}\n${r.text || ""}`;
      })
      .join("\n\n");

    // ---------- FINAL PROMPT (COLAB STYLE) ----------
    const prompt = `
You are an AI assistant. 
You MUST answer EXACTLY in the following format, identical to the Google Colab notebook output:

---

**Main Answer Section (Exa + CSV synthesis):**
Write a clean, structured answer with:
- Bold section headers
- Numbered use cases
- Bullet points for trends
- No table here
- Write paragraphs using Exa insights + CSV tool descriptions

---

**EXA WEB RESULTS:**
Print bullet points of raw Exa snippets exactly like the notebook.

---

**PINECONE CSV RESULTS (Table Format):**
Print a Markdown table of all CSV metadata rows retrieved.

---

USER QUERY:
${query}

EXA SNIPPETS:
${exaText}

CSV ROWS (structured):
${JSON.stringify(csvRows, null, 2)}

---

Now generate the final answer EXACTLY in the above notebook format.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    return NextResponse.json({ answer: completion.choices[0].message?.content });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
