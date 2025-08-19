// netlify/functions/homeGreeting.js
import OpenAI from "openai";

const client = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export async function handler(event, context) {
	try {
		const response = await client.responses.create({
			model: "gpt-5-nano",
			input: "Give a short, friendly one-sentence greeting (in English) for a personal website that uses different large language models for various tools. Do not include explanations or translations. Do not use any emojis. Do not use quotation marks around the response and keep it short."
		});

		// The SDK gives you a convenience property for the full text:
		const message = response.output_text ?? "";

		return {
			statusCode: 200,
			body: JSON.stringify({ message }),
		};
	} catch (err) {
		return {
			statusCode: 500,
			body: JSON.stringify({ error: err.message }),
		};
	}
}