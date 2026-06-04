import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en";
import fr from "./fr";
import ar from "./ar";

const LANG_KEY = "cod_dashboard_lang";

function getInitialLanguage(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored) return stored;
  }
  return "fr";
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fr: { translation: fr }, ar: { translation: ar } },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: string) {
  i18n.changeLanguage(lang);
  if (typeof window !== "undefined") {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }
}

export default i18n;
