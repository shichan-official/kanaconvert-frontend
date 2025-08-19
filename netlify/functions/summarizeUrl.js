import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  try {
    const { url } = JSON.parse(event.body);
    if (!url || !/^https?:\/\//.test(url)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid URL' }) };
    }

    // Fetch the HTML content of the page
    const pageRes = await fetch(url, { timeout: 10000 });
    const html = await pageRes.text();

    // Load and clean the HTML with Cheerio
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, noscript, aside, iframe').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    const cleanedText = text.slice(0, 8000); // Limit to 8k chars

    // Call OpenRouter to summarize
    const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-3b-instruct:free",
        messages: [{
          role: "user",
          content: `Summarize the following webpage content clearly. Remove all boilerplate like nav menus, URLs, footers, and unrelated text:\n\n${cleanedText}`
        }]
      })
    });

    if (!llmRes.ok) {
      return { statusCode: llmRes.status, body: JSON.stringify({ error: "LLM request failed." }) };
    }

    const llmData = await llmRes.json();
    const summary = llmData.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ summary })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to summarize URL." })
    };
  }
}