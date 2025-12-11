// i18n.ts
export const locales = ['en', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const pathnames = {
  '/': '/',
  '/about': {
    en: '/about',
    es: '/sobre-nosotros',
    fr: '/a-propos',
    de: '/ueber-uns'
  },
  '/contact': {
    en: '/contact',
    es: '/contacto',
    fr: '/contact',
    de: '/kontakt'
  }
} as const;




// For type safety when mapping
export const localeArray: string[] = ['en', 'fr']; // Use this for mapping

// Or if you want to keep the const assertion:
export const localesForMapping = [...locales] as string[];