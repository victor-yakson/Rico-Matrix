import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type VisitorRow = {
  id: number;
  visitor_id: string;
  country_code: string;
  country_name: string;
  created_at: string;
  updated_at: string;
};

export type VisitorCountryStat = {
  country_code: string;
  country_name: string;
  unique_visitors: number;
};

export type VisitorSummary = {
  unique_visitors: number;
  countries: number;
};

const COUNTRY_SELECT =
  "id,visitor_id,country_code,country_name,created_at,updated_at";

export const sanitizeVisitorId = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[a-zA-Z0-9_-]{12,128}$/.test(trimmed)) return null;
  return trimmed;
};

export const getCountryFromRequest = (headers: Headers) => {
  const headerCandidates = [
    headers.get("x-vercel-ip-country"),
    headers.get("cf-ipcountry"),
    headers.get("cloudfront-viewer-country"),
    headers.get("x-country-code"),
    headers.get("x-geo-country"),
  ];

  const fromHeaders = headerCandidates.find(
    (value) => typeof value === "string" && /^[A-Za-z]{2}$/.test(value)
  );

  const acceptLanguage = headers.get("accept-language");
  const acceptLanguageRegion =
    acceptLanguage
      ?.split(",")[0]
      ?.trim()
      ?.split("-")[1]
      ?.toUpperCase() || null;

  const countryCode = (
    fromHeaders ||
    acceptLanguageRegion ||
    (process.env.NODE_ENV === "development" ? "US" : "XX")
  ).toUpperCase();

  let countryName = "Unknown";
  if (countryCode !== "XX") {
    try {
      const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
      countryName = displayNames.of(countryCode) || countryName;
    } catch {
      countryName = countryCode;
    }
  }

  return { countryCode, countryName };
};

export const registerVisitor = async (input: {
  visitorId: string;
  countryCode: string;
  countryName: string;
}) => {
  const supabase = getSupabaseAdmin();
  const visitorId = sanitizeVisitorId(input.visitorId);

  if (!visitorId) {
    throw new Error("Invalid visitor ID.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("visitors")
    .select(COUNTRY_SELECT)
    .eq("visitor_id", visitorId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || "Failed to check visitor record.");
  }

  if (existing) {
    return {
      created: false,
      visitor: existing as VisitorRow,
    };
  }

  const payload = {
    visitor_id: visitorId,
    country_code: input.countryCode || "XX",
    country_name: input.countryName || "Unknown",
  };

  const { data: inserted, error: insertError } = await supabase
    .from("visitors")
    .insert(payload)
    .select(COUNTRY_SELECT)
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: row, error: retryError } = await supabase
        .from("visitors")
        .select(COUNTRY_SELECT)
        .eq("visitor_id", visitorId)
        .maybeSingle();

      if (retryError) {
        throw new Error(retryError.message || "Failed to recover visitor record.");
      }

      if (row) {
        return {
          created: false,
          visitor: row as VisitorRow,
        };
      }
    }

    throw new Error(insertError.message || "Failed to register visitor.");
  }

  return {
    created: true,
    visitor: inserted as VisitorRow,
  };
};

export const getVisitorCountryStats = async () => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("visitor_country_stats")
    .select("country_code,country_name,unique_visitors")
    .order("unique_visitors", { ascending: false })
    .order("country_name", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to load visitor country stats.");
  }

  return ((data as VisitorCountryStat[] | null) || []).map((row) => ({
    country_code: row.country_code,
    country_name: row.country_name,
    unique_visitors: Number(row.unique_visitors || 0),
  }));
};

export const getVisitorSummary = async () => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("visitor_summary_stats")
    .select("unique_visitors,countries")
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load visitor summary.");
  }

  const summary = (data as VisitorSummary | null) || {
    unique_visitors: 0,
    countries: 0,
  };

  return {
    unique_visitors: Number(summary.unique_visitors || 0),
    countries: Number(summary.countries || 0),
  };
};
