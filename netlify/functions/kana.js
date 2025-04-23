// netlify/functions/kana.js

export async function handler(event, context) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const { text } = JSON.parse(event.body || "{}");
  
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct",
        messages: [{
          role: "user",
          content: `Convert the following Japanese text into the following formats and return the result strictly as a JSON object:
            {
                "hiragana": "...",
                "katakana": "...",
                "halfWidthKatakana": "...",
                "romanji": "..."
            }
            
            Text to convert:
            ${text}`
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
      body: message
    };
  }
  