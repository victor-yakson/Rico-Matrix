// i18n/request.ts  (or src/i18n/request.ts if you're using /src)
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, locales, type Locale } from "./config";

export default getRequestConfig(async () => {
  // ✅ Next 16: cookies() is async
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value as Locale | undefined;

  const locale: Locale =
    cookieLocale && locales.includes(cookieLocale)
      ? cookieLocale
      : defaultLocale;

  return {
    locale,
    // Adjust this path based on where your JSON files actually live
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
