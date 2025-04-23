// netlify/functions/kana.js

export async function handler(event, context) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const body = JSON.parse(event.body || "{}");
    const inputText = body.text || "";
  
    const prompt = `
    You are a Japanese text converter for a Kana conversion website. Given any input, return a JSON object with four keys:

    - "hiragana": the entire input converted to Hiragana (convert all Kanji and Katakana)
    - "katakana": the same as above, but converted to full-width Katakana
    - "halfWidthKatakana": same as "katakana" but converted to **half-width Katakana characters**
    - "romanji": the input transliterated to Romaji

    Strict rules:
    - Absolutely no Kanji characters are allowed in any of the fields — fully convert them. Convert everything, including polite expressions like お願いします, into full kana.
    - In "halfWidthKatakana", all Katakana (including those with dakuten like グ or ゾ, or handakuten like パ) **must be correctly converted to their half-width forms** like  ｸﾞ, ｿﾞ, ﾊﾟ.
    - There is a one-to-one mapping from katakana to halfWidthKatakana, so they must look nearly identical and have the same number of characters.
    - Do not guess or use approximate characters. Use correct phonetic mappings only.
    - Alphabetical characters (A-Z, a-z) should be returned as-is in all fields.
    - Do not return extra symbols like 〜 or ・ unless they were in the original input.
    - Return only raw valid compact JSON. No markdown, no code block, no explanation.
    - Always convert 清香 as "さやか" (Sayaka). Do not use other readings.

    Examples:
    Input: "Test"
    Output: {"hiragana":"てすと","katakana":"テスト","halfWidthKatakana":"ﾃｽﾄ","romanji":"Test"}

    Input: "漢字ですTEST"
    Output: {"hiragana":"かんじですTEST","katakana":"カンジデステスト","halfWidthKatakana":"ｶﾝｼﾞﾃﾞｽﾃｽﾄ","romanji":"kanji desu TEST"}

    Input: "元気ですか？今木場駅なの？This is a test"
    Output: {"hiragana":"げんきですか？いまきばえきなの？This is a test","katakana":"ゲンキデスカ？イマキバエキナノ？This is a test","halfWidthKatakana":"ｹﾞﾝｷﾃﾞｽｶ?ｲﾏｷﾊﾞｴｷﾅﾉ?This is a test","romanji":"genki desu ka? ima kiba eki nano? This is a test"}

    Input: "清香です"
    Output: {"hiragana":"さやかです","katakana":"サヤカです","halfWidthKatakana":"ｻﾔｶです","romanji":"Sayaka desu"}

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