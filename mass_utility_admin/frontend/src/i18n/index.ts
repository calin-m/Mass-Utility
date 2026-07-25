import en, { TranslationSchema } from './locales/en';
import ro from './locales/ro';
import de from './locales/de';
import fr from './locales/fr';
import es from './locales/es';

export type Language = 'en' | 'ro' | 'de' | 'fr' | 'es';

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export const TRANSLATIONS: Record<Language, TranslationSchema> = {
  en,
  ro,
  de,
  fr,
  es,
};

export { en, ro, de, fr, es };
export type { TranslationSchema };
