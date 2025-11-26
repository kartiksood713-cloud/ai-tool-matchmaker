export async function exaSearch(query: string) {
  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": process.env.EXA_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        numResults: 3,
      }),
    });

    const data = await res.json();
    return data.results || [];
  } catch (err) {
    return [];
  }
}
