// netlify/functions/kana.js

export async function handler(event, context) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const body = JSON.parse(event.body || "{}");
    const inputText = body.text || "";
  
    const prompt = `
    You are a Kana converter for a Japanese language tool. Given any input string, return a JSON object with 4 keys:

    - "hiragana": full conversion of all Kanji and Katakana to Hiragana (alphabet characters and punctuation must be preserved as-is)
    - "katakana": full conversion of all Kanji and Hiragana to full-width Katakana (alphabet characters and punctuation must be preserved as-is)
    - "halfWidthKatakana": identical to katakana, but all Katakana characters must be in **half-width format**
    - "romanji": Romaji transliteration of the converted text (preserving all alphabet input as-is)

    Strict rules:
    - All Kanji must be converted to Hiragana/Katakana (do not leave any Kanji in output)
    - Katakana must be converted to Hiragana for "hiragana" field, and vice versa
    - English letters and punctuation (e.g., TEST, !) must not be changed in any field
    - Preserve **input order** exactly — do not drop, reorder, or duplicate characters
    - Half-width Katakana must be an accurate visual transformation of Katakana (e.g., カンジ → ｶﾝｼﾞ)
    - Never include 〜 or ・ unless in original input
    - Output must be compact raw JSON (no code blocks, no extra text)

    Examples:
    - Input: "Test" → {"hiragana":"Test","katakana":"Test","halfWidthKatakana":"Test","romanji":"Test"}
    - Input: "漢字ですTEST" → {"hiragana":"かんじですTEST","katakana":"カンジデスTEST","halfWidthKatakana":"ｶﾝｼﾞﾃﾞｽTEST","romanji":"kanji desu TEST"}
    - Input: "カタカナ" → {"hiragana":"かたかな","katakana":"カタカナ","halfWidthKatakana":"ｶﾀｶﾅ","romanji":"katakana"}
    - Input: "TESTあいうえおアイウエオ銀座駅" → {"hiragana":"TESTあいうえおあいうえおぎんざえき","katakana":"TESTアイウエオアイウエオギンザエキ","halfWidthKatakana":"TESTｱｲｳｴｵｱｲｳｴｵｷﾞﾝｻﾞｴｷ","romanji":"TEST a i u e o ai u e o ginza eki"}

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