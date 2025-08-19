// netlify/functions/kana.js
export async function handler(event) {
	if (event.httpMethod !== "POST") {
		return { statusCode: 405, body: "Method Not Allowed" };
	}

	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		return { statusCode: 500, body: JSON.stringify({ error: "OPENAI_API_KEY not set" }) };
	}

	try {
		const body = JSON.parse(event.body || "{}");
		const inputText = String(body.text || "");
		const allowed = new Set(["gpt-5-nano", "gpt-5-mini", "gpt-4o-mini"]);
		const model = allowed.has(body.model) ? body.model : "gpt-5-nano";

		// keep cost sane
		const text = inputText.slice(0, 4000);

		const prompt = `
You are a Japanese text converter for a Kana conversion website. Given any input, return a JSON object with four keys:

- "hiragana": the entire input converted to Hiragana (convert all Kanji and Katakana)
- "katakana": the same as above, but converted to full-width Katakana
- "halfWidthKatakana": same as "katakana" but converted to half-width Katakana characters
- "romanji": the input transliterated to Romaji

Strict rules:
- Absolutely no Kanji in any fields—fully convert them.
- In "halfWidthKatakana", use correct half-width forms, including dakuten/handakuten (e.g., ｸﾞ, ｿﾞ, ﾊﾟ).
- Katakana and halfWidthKatakana should align character-by-character as much as feasible.
- ASCII letters (A–Z, a–z) must be returned as-is.
- Do not add/remove symbols like 〜 or ・ unless they exist in the input.
- Return only raw, valid, compact JSON. No markdown, no code fences, no commentary.

Input: "${text}"
`.trim();

		const res = await fetch("https://api.openai.com/v1/responses", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${apiKey}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				model,
				input: prompt,
				temperature: 0
			})
		});

		if (!res.ok) {
			const errText = await res.text();
			console.error("OpenAI 4xx/5xx:", errText);
			return {
				statusCode: res.status,
				body: JSON.stringify({
					hiragana: "",
					katakana: "",
					halfWidthKatakana: "",
					romanji: "",
					error: `LLM request failed: ${errText}`
				})
			};
		}

		const data = await res.json();

		let content = "";
		if (data.output_text) content = data.output_text;
		else if (Array.isArray(data.output))
			content = data.output
				.flatMap(o => Array.isArray(o.content) ? o.content : [])
				.map(c => c.text ?? c.value ?? "")
				.join("");
		else if (data.choices?.[0]?.message?.content) content = data.choices[0].message.content;

		content = (content || "").trim().replace(/```(?:json)?\s*([\s\S]*?)\s*```/i, "$1").trim();
		if (!content.startsWith("{")) {
			const m = content.match(/{[\s\S]*}/);
			if (m) content = m[0];
		}

		let parsed;
		try {
			parsed = JSON.parse(content);
		} catch {
			console.error("Failed to parse model output:", content);
			return {
				statusCode: 200,
				body: JSON.stringify({
					hiragana: "",
					katakana: "",
					halfWidthKatakana: "",
					romanji: "",
					error: "Failed to parse model output"
				})
			};
		}

		return {
			statusCode: 200,
			body: JSON.stringify({
				hiragana: parsed.hiragana || "",
				katakana: parsed.katakana || "",
				halfWidthKatakana: parsed.halfWidthKatakana || "",
				romanji: parsed.romanji || ""
			})
		};
	} catch (e) {
		console.error(e);
		return {
			statusCode: 500,
			body: JSON.stringify({
				hiragana: "",
				katakana: "",
				halfWidthKatakana: "",
				romanji: "",
				error: "Unexpected server error"
			})
		};
	}
}