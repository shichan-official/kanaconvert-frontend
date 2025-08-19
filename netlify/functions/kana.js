// netlify/functions/kana.js
export async function handler(event, context) {
	if (event.httpMethod !== "POST") {
		return { statusCode: 405, body: "Method Not Allowed" };
	}

	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		return {
			statusCode: 500,
			body: JSON.stringify({ error: "Server misconfigured: OPENAI_API_KEY not set." })
		};
	}

	try {
		const body = JSON.parse(event.body || "{}");
		const inputText = body.text || "";
		// Allow optional override to other cheap OpenAI models; default to gpt-5-nano.
		const allowed = new Set(["gpt-5-nano", "gpt-5-mini", "gpt-4o-mini"]);
		let model = typeof body.model === "string" && allowed.has(body.model) ? body.model : "gpt-5-nano";

		// Safety: very long inputs drive cost; clamp a bit
		const text = String(inputText).slice(0, 256);

		const prompt = `
You are a Japanese text converter for a Kana conversion website. Given any input, return a JSON object with four keys:

- "hiragana": the entire input converted to Hiragana (convert all Kanji and Katakana)
- "katakana": the same as above, but converted to full-width Katakana
- "halfWidthKatakana": same as "katakana" but converted to **half-width Katakana characters**
- "romanji": the input transliterated to Romaji

Strict rules:
- Absolutely no Kanji characters are allowed in any of the fields — fully convert them. Convert everything, including polite expressions like お願いします, into full kana.
- In "halfWidthKatakana", all Katakana (including dakuten like グ/ゾ and handakuten like パ) **must** use correct half-width forms (e.g., ｸﾞ, ｿﾞ, ﾊﾟ) with proper combining where applicable.
- There is a one-to-one mapping from katakana to halfWidthKatakana (same number of characters where feasible).
- ASCII letters (A–Z, a–z) should be returned as-is in all fields.
- Do not add or remove symbols like 〜 or ・ unless present in the original input.
- Return **only** raw, valid, compact JSON. No markdown, no code fences, no commentary.

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
				temperature: 0,               // deterministic
				max_output_tokens: 300        // plenty for compact JSON
			})
		});

		if (!res.ok) {
			const err = await res.text();
			return {
				statusCode: res.status,
				body: JSON.stringify({
					hiragana: "",
					katakana: "",
					halfWidthKatakana: "",
					romanji: "",
					error: `LLM request failed: ${err}`
				})
			};
		}

		const data = await res.json();

		// Extract plain text from Responses API
		let content = "";
		if (data.output_text) {
			content = data.output_text;
		} else if (Array.isArray(data.output)) {
			content = data.output
				.flatMap(o => Array.isArray(o.content) ? o.content : [])
				.map(c => c.text ?? c.value ?? "")
				.join("");
		} else if (data.choices?.[0]?.message?.content) {
			// Fallback if gateway returns chat-like shape
			content = data.choices[0].message.content;
		}
		content = (content || "").trim();

		// Strip code fences if model added them
		content = content.replace(/```(?:json)?\s*([\s\S]*?)\s*```/i, "$1").trim();

		// If there’s extra text, try to isolate the first JSON object
		if (!content.startsWith("{")) {
			const m = content.match(/{[\s\S]*}/);
			if (m) content = m[0];
		}

		let parsed;
		try {
			parsed = JSON.parse(content);
		} catch (e) {
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
	} catch (err) {
		console.error("Unexpected error:", err);
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
