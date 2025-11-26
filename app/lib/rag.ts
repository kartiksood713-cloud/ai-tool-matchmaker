import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export async function runRAG(query: string) {
  try {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const vec = emb.data[0].embedding;

    const index = pc.index("ai-tools");

    const results = await index.query({
      vector: vec,
      topK: 5,
      includeMetadata: true,
    });

    return results.matches || [];
  } catch (err) {
    console.error(err);
    return [];
  }
}
