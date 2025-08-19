// netlify/functions/summarize.js
import * as cheerio from "cheerio";

export async function handler(event) {
	if (event.httpMethod !== "POST") {
		return { statusCode: 405, body: "Method Not Allowed" };
	}

	try {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			return { statusCode: 500, body: JSON.stringify({ error: "OPENAI_API_KEY not set" }) };
		}

		const { url } = JSON.parse(event.body || "{}");
		let inputUrl = (url || "").trim();

		// normalize: allow "www.example.com"
		if (inputUrl && !/^https?:\/\//i.test(inputUrl)) {
			inputUrl = `https://${inputUrl}`;
		}

		// validate
		try {
			new URL(inputUrl);
		} catch {
			return { statusCode: 400, body: JSON.stringify({ error: "Invalid URL format", received: url }) };
		}

		// fetch page with timeout
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 10000);
		let html = "";
		try {
			const pageRes = await fetch(inputUrl, { redirect: "follow", signal: controller.signal });
			clearTimeout(timer);
			html = await pageRes.text();
		} catch (e) {
			clearTimeout(timer);
			return { statusCode: 502, body: JSON.stringify({ error: "Failed to fetch the page" }) };
		}

		const $ = cheerio.load(html);
		$("script, style, nav, footer, header, noscript, aside, iframe").remove();
		const text = $("body").text().replace(/\s+/g, " ").trim();
		const cleanedText = text.slice(0, 8000);

		const prompt = `Summarize the following webpage content clearly and briefly in English.
- Ignore navigation, ads, boilerplate.
- Output 4–6 concise bullet points.

CONTENT:
${cleanedText}`;

		const aiRes = await fetch("https://api.openai.com/v1/responses", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${apiKey}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				model: "gpt-5-nano",
				input: prompt,
				temperature: 0.2
			})
		});

		if (!aiRes.ok) {
			const errText = await aiRes.text();
			console.error("OpenAI 4xx/5xx:", errText);
			return { statusCode: aiRes.status, body: errText };
		}

		const data = await aiRes.json();
		const summary =
			data.output_text
			|| (Array.isArray(data.output)
				? data.output.flatMap(o => Array.isArray(o.content) ? o.content : []).map(c => c.text ?? c.value ?? "").join("")
				: (data.choices?.[0]?.message?.content || ""));

		return { statusCode: 200, body: JSON.stringify({ summary: summary.trim() }) };
	} catch (e) {
		console.error(e);
		return { statusCode: 500, body: JSON.stringify({ error: "Failed to summarize URL" }) };
	}
}