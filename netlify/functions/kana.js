// netlify/functions/kana.js

export async function handler(event, context) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const body = JSON.parse(event.body || "{}");
    const inputText = body.text || "";
  
    const prompt = `
    You are a text converter for a Kana conversion website. Given any input text, return a JSON object with four keys:

    - "hiragana": the input fully converted to Hiragana (including any Kanji)
    - "katakana": same as above, but in full-width Katakana
    - "halfWidthKatakana": same as Katakana, but using **half-width Katakana characters**
    - "romanji": the input transliterated to Roman letters (Romaji)

    Rules:

    - Do not leave any Kanji characters in the output — convert them into Hiragana or Katakana.
    - Apply conversion rules to the entire input consistently. Do not skip, ignore, or mix styles.
    - If the input contains Latin (alphabet) letters, leave them unchanged across all fields.
    - Do not add or remove punctuation, symbols, or characters unless they are part of the input.
    - For \`halfWidthKatakana\`, use strict character-for-character conversion from full-width Katakana using Unicode half-width equivalents (range FF61–FF9F).

    Dakuten/Handakuten Rules:

    - カ → ｶ, ガ → ｶﾞ, キ → ｷ, ギ → ｷﾞ, ク → ｸ, グ → ｸﾞ, ケ → ｹ, ゲ → ｹﾞ, コ → ｺ, ゴ → ｺﾞ
    - サ → ｻ, ザ → ｻﾞ, シ → ｼ, ジ → ｼﾞ, ス → ｽ, ズ → ｽﾞ, セ → ｾ, ゼ → ｾﾞ, ソ → ｿ, ゾ → ｿﾞ
    - タ → ﾀ, ダ → ﾀﾞ, チ → ﾁ, ヂ → ﾁﾞ, ツ → ﾂ, ヅ → ﾂﾞ, テ → ﾃ, デ → ﾃﾞ, ト → ﾄ, ド → ﾄﾞ
    - ナ → ﾅ, ニ → ﾆ, ヌ → ﾇ, ネ → ﾈ, ノ → ﾉ
    - ハ → ﾊ, バ → ﾊﾞ, パ → ﾊﾟ, ヒ → ﾋ, ビ → ﾋﾞ, ピ → ﾋﾟ, フ → ﾌ, ブ → ﾌﾞ, プ → ﾌﾟ, ヘ → ﾍ, ベ → ﾍﾞ, ペ → ﾍﾟ, ホ → ﾎ, ボ → ﾎﾞ, ポ → ﾎﾟ
    - マ → ﾏ, ミ → ﾐ, ム → ﾑ, メ → ﾒ, モ → ﾓ
    - ヤ → ﾔ, ユ → ﾕ, ヨ → ﾖ
    - ラ → ﾗ, リ → ﾘ, ル → ﾙ, レ → ﾚ, ロ → ﾛ
    - ワ → ﾜ, ヲ → ｦ, ン → ﾝ

    Special Cases:

    - For long vowels:
        - ァ → ｧ, ア → ｱ, ィ → ｨ, イ → ｨ, ゥ → ｩ, ウ → ｩ, ェ → ｪ, エ → ｴ, ォ → ｩ, オ → ｵ
        - カ → ｶ, キ → ｷ, ク → ｸ, ケ → ｹ, コ → ｺ (for vowel extensions)
    - For half-width Katakana, follow the mapping exactly as Unicode defines it.

    Do not include explanations, descriptions, or code blocks. Just return the raw JSON object.

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