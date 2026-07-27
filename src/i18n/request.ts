import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  const locale = process.env.NEXT_PUBLIC_APP_LOCALE || 'es';
  const messages = (await import(`../../messages/es.json`)).default;

  return {
    locale,
    messages,
  };
});
