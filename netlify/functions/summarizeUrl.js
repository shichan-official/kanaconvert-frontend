// netlify/functions/summarize.js
import * as cheerio from 'cheerio';

export async function handler(event) {
	if (event.httpMethod !== 'POST') {
		return { statusCode: 405, body: 'Method Not Allowed' };
	}

	try {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured: OPENAI_API_KEY not set.' }) };
		}

		const { url } = JSON.parse(event.body || '{}');
		if (!url || !/^https?:\/\//i.test(url)) {
			return { statusCode: 400, body: JSON.stringify({ error: 'Invalid URL' }) };
		}

		// Fetch page with a 10s timeout
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 10000);
		let html = '';
		try {
			const pageRes = await fetch(url, { redirect: 'follow', signal: controller.signal });
			clearTimeout(timer);
			html = await pageRes.text();
		} catch {
			clearTimeout(timer);
			return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch the page.' }) };
		}

		// Clean with Cheerio
		const $ = cheerio.load(html);
		$('script, style, nav, footer, header, noscript, aside, iframe').remove();
		const text = $('body').text().replace(/\s+/g, ' ').trim();
		const cleanedText = text.slice(0, 5000); // keep prompt cheap

		const prompt = `Summarize the following webpage content clearly and briefly in English.
- Ignore navigation, ads, boilerplate.
- Output 4–6 concise bullet points.

CONTENT:
${cleanedText}`;

		// OpenAI Responses API
		const aiRes = await fetch('https://api.openai.com/v1/responses', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: 'gpt-5-nano',
				input: prompt,
				temperature: 0.2
			})
		});

		if (!aiRes.ok) {
			const err = await aiRes.text();
			return { statusCode: aiRes.status, body: err };
		}

		const data = await aiRes.json();
		const summary =
			data.output_text
			|| (Array.isArray(data.output)
				? data.output.flatMap(o => Array.isArray(o.content) ? o.content : []).map(c => c.text ?? c.value ?? '').join('')
				: (data.choices?.[0]?.message?.content || ''));

		return { statusCode: 200, body: JSON.stringify({ summary: summary.trim() }) };
	} catch {
		return { statusCode: 500, body: JSON.stringify({ error: 'Failed to summarize URL.' }) };
	}
}