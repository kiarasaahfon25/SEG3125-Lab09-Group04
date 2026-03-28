import { useCallback, useEffect, useState } from 'react';
import { Languages } from 'lucide-react';

/** Source language of copy in the app (Google Translate translates from this). */
const PAGE_LANG = 'en';
/** Second language offered in the lab bilingual experience. */
const ALT_LANG = 'fr';

let translateScriptInjected = false;
let translateWidgetMounted = false;

function parseGoogTransTarget() {
  const match = document.cookie.match(/googtrans=\/[^/]+\/([^;]+)/);
  if (!match) return PAGE_LANG;
  const code = match[1].trim();
  if (code === PAGE_LANG || code === '') return PAGE_LANG;
  return code;
}

function clearGoogTransCookies() {
  const expires = 'Thu, 01 Jan 1970 00:00:01 GMT';
  const host = window.location.hostname;
  document.cookie = `googtrans=;path=/;expires=${expires}`;
  document.cookie = `googtrans=;path=/;domain=${host};expires=${expires}`;
  if (host && !host.startsWith('localhost')) {
    document.cookie = `googtrans=;path=/;domain=.${host};expires=${expires}`;
  }
}

function setLanguageCookie(targetLang) {
  if (targetLang === PAGE_LANG) {
    clearGoogTransCookies();
  } else {
    document.cookie = `googtrans=/${PAGE_LANG}/${targetLang};path=/`;
  }
}

function googleTranslateElementInit() {
  const el = document.getElementById('google_translate_element');
  if (!el || !window.google?.translate?.TranslateElement) return;
  if (translateWidgetMounted) return;
  translateWidgetMounted = true;

  new window.google.translate.TranslateElement(
    {
      pageLanguage: PAGE_LANG,
      includedLanguages: `${PAGE_LANG},${ALT_LANG}`,
      layout: window.google.translate.TranslateElement.InlineLayout.HORIZONTAL,
    },
    'google_translate_element'
  );
}

export default function LanguageSwitcher({ className = '' }) {
  const [active, setActive] = useState(PAGE_LANG);

  useEffect(() => {
    setActive(parseGoogTransTarget());
  }, []);

  useEffect(() => {
    window.googleTranslateElementInit = googleTranslateElementInit;

    if (!translateScriptInjected) {
      translateScriptInjected = true;
      const script = document.createElement('script');
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate) {
      googleTranslateElementInit();
    }
  }, []);

  const choose = useCallback((lang) => {
    setLanguageCookie(lang);
    setActive(lang);
    window.location.reload();
  }, []);

  return (
    <div className={`notranslate flex items-center gap-2 ${className}`}>
      <Languages className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />
      <div
        className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium"
        role="group"
        aria-label="Site language"
      >
        <button
          type="button"
          onClick={() => choose(PAGE_LANG)}
          className={`px-3 py-1.5 rounded-md transition ${
            active === PAGE_LANG ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => choose(ALT_LANG)}
          className={`px-3 py-1.5 rounded-md transition ${
            active === ALT_LANG ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Français
        </button>
      </div>
    </div>
  );
}
