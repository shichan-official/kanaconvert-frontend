const CACHE_KEY = 'homeGreetingMessage';
const CACHE_TIMESTAMP_KEY = 'homeGreetingMessageTimestamp';
const KANA_CACHE_KEY = 'kanaGreetingMessage';
const KANA_CACHE_TIMESTAMP_KEY = 'kanaGreetingMessageTimestamp';
const CACHE_EXPIRATION_TIME = 10 * 1000; // 10 seconds

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
  
  const cachedMessage = localStorage.getItem(CACHE_KEY);
  const cachedTimestamp = parseInt(localStorage.getItem(CACHE_TIMESTAMP_KEY), 10);

  // If cached message exists and it's still within the expiration period
  if (cachedMessage && (Date.now() - cachedTimestamp < CACHE_EXPIRATION_TIME)) {
    typeWriterEffect(cachedMessage, el, 30);
  } else {
    try {
      const res = await fetch("/.netlify/functions/homeGreeting");
      const data = await res.json();
      const message = data.message || "Welcome to my site!";

      // Cache the message and the timestamp
      localStorage.setItem(CACHE_KEY, message);
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());

      typeWriterEffect(message, el, 30);
    } catch (err) {
      el.textContent = "Welcome to my site!";
    }
  }
}

async function loadKanaGreeting() {
  const el = document.getElementById("kanaGreeting");

  // Check if the message is cached in localStorage
  const cachedMessage = localStorage.getItem(KANA_CACHE_KEY);
  const cachedTimestamp = parseInt(localStorage.getItem(KANA_CACHE_TIMESTAMP_KEY), 10);

  // If cached message exists and it's still within the expiration period
  if (cachedMessage && (Date.now() - cachedTimestamp < CACHE_EXPIRATION_TIME)) {
    typeWriterEffect(cachedMessage, el, 30);
  } else {
    try {
      const res = await fetch("/.netlify/functions/kanaGreeting");
      const data = await res.json();
      const message = data.message || "Welcome to the Kana Converter!";

      // Cache the message and the timestamp
      localStorage.setItem(KANA_CACHE_KEY, message);
      localStorage.setItem(KANA_CACHE_TIMESTAMP_KEY, Date.now().toString());

      typeWriterEffect(message, el, 30);
    } catch (err) {
      el.textContent = "Welcome to the Kana Converter!";
    }
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

function typeWriterEffect(text, element, delay = 50) {
    element.textContent = "";
    let i = 0;
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, delay);
        }
    }
    type();
}

window.addEventListener("DOMContentLoaded", () => {
    setLanguage("en");
    loadHomeGreeting();
});