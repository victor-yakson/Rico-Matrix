// app/actions/setLocale.ts
"use server";

import { cookies } from "next/headers";
import { locales, type Locale } from "../../i18n/config"; 
// ^ adjust path if your i18n/config.ts is elsewhere

export async function setLocale(locale: Locale) {
  if (!locales.includes(locale)) return;

  // ✅ cookies() is async in Next 16
  const cookieStore = await cookies();

  cookieStore.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}
