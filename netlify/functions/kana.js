// netlify/functions/kana.js

export async function handler(event, context) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const body = JSON.parse(event.body || "{}");
    const inputText = body.text || "";
  
    const prompt = `
    You are a text converter for a Kana conversion website. Given any input text, return a JSON object with four keys:

    - "hiragana": the input fully converted to Hiragana (including any Kanji)
    - "katakana": the same as above, but in full-width Katakana
    - "halfWidthKatakana": same as Katakana but using half-width Katakana characters
    - "romanji": the input transliterated to Roman letters (Romaji)

    Rules:
    - You must apply conversion rules to the **entire** input string. Do not skip, omit, or mix formats (e.g. kana + romaji).
    - Do not leave any Kanji characters in the output — convert them fully to Hiragana or Katakana.
    - Do not add or modify punctuation, symbols, or characters. Only use what's in the original input.
    - If conversion is not possible for a field, return the original string in that field.
    - If the input includes English, transliterate it phonetically where possible.

    Output must be:
    - A raw compact JSON object only (no code blocks, no comments, no formatting)
    - For example:
    - "Test" → {"hiragana":"てすと","katakana":"テスト","halfWidthKatakana":"ﾃｽﾄ","romanji":"Test"}
    - "漢字ですTEST" → {"hiragana":"かんじですてすと","katakana":"カンジデステスト","halfWidthKatakana":"ｶﾝｼﾞﾃﾞｽﾃｽﾄ","romanji":"KANJI DESU TEST"}
    - "TESTTESTTEST" → {"hiragana":"てすとてすとてすと","katakana":"テストテストテスト","halfWidthKatakana":"ﾃｽﾄﾃｽﾄﾃｽﾄ","romanji":"TESTTESTTEST"}

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
      content = content.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, "$1").trim();
  
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