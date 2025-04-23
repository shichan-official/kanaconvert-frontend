// netlify/functions/kana.js

export async function handler(event, context) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const body = JSON.parse(event.body || "{}");
    const inputText = body.text || "";
  
    const prompt = `
    You are a text converter for a Kana conversion website. Given any input text, return a JSON object with four keys:

    - "hiragana": the input fully converted to Hiragana (convert all Kanji and Katakana, but leave English letters unchanged)
    - "katakana": same as above, but convert to full-width Katakana
    - "halfWidthKatakana": same as Katakana but using half-width Katakana characters
    - "romanji": the input transliterated to Roman letters (Romaji), but leave original alphabet characters unchanged

    Rules:
    - Leave English alphabet characters (A-Z, a-z) exactly as they are in **all** fields.
    - Do not modify, replace, or transliterate alphabet characters.
    - Convert all Kanji and Kana fully.
    - Do not skip, omit, or mix formats.
    - Do not add or modify punctuation, symbols, or characters. Preserve them as-is from input.
    - If conversion is not possible for a field, return the original input.

    Output must be:
    - A raw compact JSON object only (no formatting, no explanations, no code blocks)

    Examples:
    - "Test" → {"hiragana":"Test","katakana":"Test","halfWidthKatakana":"Test","romanji":"Test"}
    - "漢字です" → {"hiragana":"かんじです","katakana":"カンジデス","halfWidthKatakana":"ｶﾝｼﾞﾃﾞｽ","romanji":"kanji desu"}
    - "漢字ですTEST" → {"hiragana":"かんじですTEST","katakana":"カンジデスTEST","halfWidthKatakana":"ｶﾝｼﾞﾃﾞｽTEST","romanji":"kanji desu TEST"}
    - "ABC" → {"hiragana":"ABC","katakana":"ABC","halfWidthKatakana":"ABC","romanji":"ABC"}

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