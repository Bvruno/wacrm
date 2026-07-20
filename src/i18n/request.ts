import { getRequestConfig } from 'next-intl/server';

const SUPPORTED_LOCALES = ['en', 'es'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

export default getRequestConfig(async () => {
  const raw = process.env.NEXT_PUBLIC_APP_LOCALE || 'en';
  const locale = SUPPORTED_LOCALES.includes(raw as Locale) ? raw : 'en';

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../../messages/en.json`)).default;
  }

  return {
    locale,
    messages,
  };
});
