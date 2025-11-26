import { NextResponse } from "next/server";
import OpenAI from "openai";
import { runRAG } from "@/app/lib/rag";
import { exaSearch } from "@/app/lib/search";
import { SYSTEM_PROMPT } from "@/app/lib/prompt";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const body = await req.json();
  const userMsg = body.message;

  const rag = await runRAG(userMsg);
  const web = await exaSearch(userMsg);

  const context = `
RAG RESULTS:
${JSON.stringify(rag, null, 2)}

WEB SEARCH RESULTS:
${JSON.stringify(web, null, 2)}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: context },
      { role: "user", content: userMsg },
    ],
  });

  return NextResponse.json({
    role: "assistant",
    content: response.choices[0].message.content,
  });
}
