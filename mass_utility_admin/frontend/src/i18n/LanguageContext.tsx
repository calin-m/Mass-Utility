// @Arch[LanguageContext]
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, TRANSLATIONS, SUPPORTED_LANGUAGES, TranslationSchema } from './index';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationSchema) => string;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'pm_admin_lang';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'en' || saved === 'ro' || saved === 'de' || saved === 'fr' || saved === 'es')) {
        return saved as Language;
      }
    } catch (e) {}
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
  };

  /**
   * Translation resolver with Master Schema Inheritance & Fallback:
   * If a translation key is missing or empty in the active language dictionary,
   * it automatically inherits and falls back to the English (en) master translation.
   */
  const t = (key: keyof TranslationSchema): string => {
    const activeDict = TRANSLATIONS[language] || TRANSLATIONS.en;
    const val = activeDict[key];
    if (val !== undefined && val !== '') {
      return val;
    }
    // Fallback inheritance to English master dictionary
    return TRANSLATIONS.en[key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};

const defaultContextValue: LanguageContextType = {
  language: 'en',
  setLanguage: () => {},
  t: (key: keyof TranslationSchema) => TRANSLATIONS.en[key] || String(key),
  supportedLanguages: SUPPORTED_LANGUAGES,
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  return context || defaultContextValue;
};
