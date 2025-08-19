// netlify/functions/homeGreeting.js
export async function handler(event, context) {
	try {
		const res = await fetch("https://api.openai.com/v1/responses", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				model: "gpt-5-nano",
				input: "Give a short, friendly one-sentence greeting (in English) for a personal website that uses different large language models for various tools. Do not include explanations or translations. Do not use any emojis. Do not use quotation marks around the response and keep it short."
			})
		});

		if (!res.ok) {
			const errText = await res.text();
			return { statusCode: res.status, body: errText };
		}

		const data = await res.json();

		// Robust text extraction (Responses API)
		let message = "";
		if (data.output_text) {
			message = data.output_text;
		} else if (Array.isArray(data.output)) {
			message = data.output
				.flatMap(o => Array.isArray(o.content) ? o.content : [])
				.map(c => c.text ?? c.value ?? "")
				.join("");
		} else if (data.choices?.[0]?.message?.content) {
			message = data.choices[0].message.content; // fallback shape
		}

		return { statusCode: 200, body: JSON.stringify({ message }) };
	} catch (e) {
		return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
	}
}
