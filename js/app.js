function switchTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  
    event.target.closest('button').classList.add('active');
    document.getElementById(tabId).classList.add('active');
  
    // Call greeting functions when specific tabs are selected
    if (tabId === 'homeTab') {
      loadHomeGreeting();
    } else if (tabId === 'kanaTab') {
      loadKanaGreeting();
    }
  }

async function performConversion() {
    const text = document.getElementById('inputText').value;

    if (!text.trim()) {
        alert('Please enter text to convert.');
        return;
    }

    try {
        const response = await fetch('/.netlify/functions/kana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
        });

        if (!response.ok) throw new Error('Conversion failed');

        const data = await response.json();
        document.getElementById('hiraganaResult').textContent = data.hiragana;
        document.getElementById('katakanaResult').textContent = data.katakana;
        document.getElementById('halfWidthKatakanaResult').textContent = data.halfWidthKatakana;
        document.getElementById('romanjiResult').textContent = data.romanji;
        document.getElementById('results').style.display = 'block';
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function copyToClipboard(id) {
    const text = document.getElementById(id).textContent;
    navigator.clipboard.writeText(text).then(() => {
        const note = document.getElementById('copyNotification');
        note.style.display = 'block';
        note.style.opacity = 1;
        setTimeout(() => {
        note.style.opacity = 0;
        setTimeout(() => note.style.display = 'none', 500);
        }, 1500);
    });
}

async function loadHomeGreeting() {
    const el = document.getElementById("homeGreeting");
  
    try {
      const res = await fetch("/.netlify/functions/homeGreeting");
      const data = await res.json();
      const message = data.message || "Welcome to my site!";
  
      // Optional: typing effect
      el.textContent = "";
      for (let i = 0; i < message.length; i++) {
        el.textContent += message[i];
        await new Promise(r => setTimeout(r, 30));
      }
    } catch (err) {
      el.textContent = "Welcome to my site!";
    }
}

async function loadKanaGreeting() {
    try {
      const response = await fetch('/.netlify/functions/greeting');
      if (!response.ok) throw new Error('Failed to load Kana greeting');
      const data = await response.json();
      const kanaTitle = document.querySelector('#kanaTab h1');
      kanaTitle.textContent = data.message;
    } catch (err) {
      console.error(err);
    }
}

const translations = {
    en: {
        home: "Home",
        summary: "Website Summarizer",
        kana: "Kana Converter",
        welcome: "Welcome",
        chooseTab: "Choose a tab above to get started.",
        summaryTitle: "Website Summarizer",
        comingSoon: "Coming soon...",
        kanaTitle: "Kana Conversion",
        inputLabel: "Enter Kanji, Katakana, or Hiragana:",
        convert: "Convert",
        hiragana: "Hiragana:",
        katakana: "Katakana:",
        halfWidth: "Half Width Katakana:",
        romanji: "Romanji:",
        copy: "Copy"
    },
    ja: {
        home: "ホーム",
        summary: "サイト要約",
        kana: "カナ変換",
        welcome: "ようこそ",
        chooseTab: "上のタブを選択してください。",
        summaryTitle: "サイト要約",
        comingSoon: "近日公開予定...",
        kanaTitle: "カナ変換",
        inputLabel: "漢字、カタカナ、またはひらがなを入力してください：",
        convert: "変換",
        hiragana: "ひらがな：",
        katakana: "カタカナ：",
        halfWidth: "半角カタカナ：",
        romanji: "ローマ字：",
        copy: "コピー"
    }
};

function setLanguage(lang) {
    const dict = translations[lang];
    document.querySelectorAll("[data-key]").forEach(el => {
        const key = el.getAttribute("data-key");
        if (dict[key]) el.textContent = dict[key];
    });
    // Update input placeholder dynamically
    document.getElementById('inputText').placeholder = 
        lang === 'ja' ? '日本語のテキストを入力してください' : 'Enter Japanese text here';
}

window.addEventListener("DOMContentLoaded", () => {
    setLanguage("en");
    loadHomeGreeting();
});