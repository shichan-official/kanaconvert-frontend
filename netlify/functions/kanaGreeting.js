// netlify/functions/kanaGreeting.js
export async function handler(event, context) {
	try {
		if (!process.env.OPENAI_API_KEY) {
			console.error("OPENAI_API_KEY missing at runtime");
			return {
				statusCode: 500,
				body: JSON.stringify({ error: "Server misconfigured: OPENAI_API_KEY not set." })
			};
		}

		const res = await fetch("https://api.openai.com/v1/responses", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				model: "gpt-5-nano",
				input: "Give a short, friendly one-sentence greeting (in English) for a kana conversion website (not a learning website). Do not include explanations or translations. Do not use any emojis. Do not use quotation marks around the response and keep it short."
			})
		});

		if (!res.ok) {
			const err = await res.text();
			console.error("OpenAI error:", err);
			return { statusCode: res.status, body: err };
		}

		const data = await res.json();
		const message =
			data.output_text
			|| (Array.isArray(data.output) ? data.output.flatMap(o => o.content ?? []).map(c => c.text ?? c.value ?? "").join("") : "")
			|| data.choices?.[0]?.message?.content
			|| "";

		return { statusCode: 200, body: JSON.stringify({ message }) };
	} catch (e) {
		console.error(e);
		return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
	}
}