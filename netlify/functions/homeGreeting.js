// netlify/functions/homeGreeting.js

export async function handler(event, context) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-3b-instruct:free",
        messages: [{
          role: "user",
          content: "Give a short, friendly one-sentence greeting (in English) for a personal website that uses different large language models for various tools. Do not include explanations or translations. Do not use any emojis. Do not use quotation marks around the response and keep it short."
        }]
      })
    });
  
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Failed to contact OpenRouter." })
      };
    }
  
    const data = await response.json();
    const message = data.choices[0].message.content;
  
    return {
      statusCode: 200,
      body: JSON.stringify({ message })
    };
}  