// netlify/functions/kana.js

export async function handler(event, context) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const body = JSON.parse(event.body || "{}");
    const inputText = body.text || "";
  
    const prompt = `
  You are a text converter for a Kana conversion website. Given any input text, return a JSON object with four keys:
  
  - "hiragana": the input converted to Hiragana (if applicable, or empty string otherwise)
  - "katakana": the input converted to full-width Katakana (if applicable, or empty string otherwise)
  - "halfWidthKatakana": the input converted to **half-width** Katakana (use half-width Katakana characters, this should be almost identical to katakana field but must be in half-width format)
  - "romanji": the input transliterated to Roman letters (Romaji)
  
  Always respond ONLY with a valid, compact JSON object. If conversion is not possible for a field, return an empty string for that field. Do not include any explanation.
  If input is English only (or contains English), do your best to transliterate for each case.
  For example if input is "Test", I expect {"hiragana":"てすと","katakana":"テスト","halfWidthKatakana":"ﾃｽﾄ","romanji":"tesuto"}
  
  Input: "${inputText}"
  `;
  
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "shisa-ai/shisa-v2-llama3.3-70b:free",
          messages: [{ role: "user", content: prompt }]
        })
      });
  
      const data = await response.json();
      console.log("OpenRouter raw response:", JSON.stringify(data, null, 2));
  
      if (!response.ok || !data.choices?.[0]?.message?.content) {
        return {
          statusCode: response.status || 500,
          body: JSON.stringify({
            hiragana: "",
            katakana: "",
            halfWidthKatakana: "",
            romanji: "",
            error: "LLM request failed or empty response"
          })
        };
      }
  
      let content = data.choices[0].message.content.trim();
  
      try {
        const parsed = JSON.parse(content);
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