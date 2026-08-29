import type { MetadataRoute } from "next";

// Internal-only routes: server endpoints, not content — no crawler needs these.
const DISALLOWED_PATHS = ["/api/"];

// Explicit entries for the crawlers that power live AI search/chat answers,
// so a blanket "*" rule (or a security tool's default crawler blocklist)
// can never be mistaken for having excluded them. Each still gets the same
// open rule as everyone else; listing them by name just makes the intent
// unambiguous and easy to audit.
const AI_CRAWLER_USER_AGENTS = [
  "OAI-SearchBot", // OpenAI/ChatGPT Search
  "ChatGPT-User", // ChatGPT browsing plugin
  "GPTBot", // OpenAI training crawler
  "PerplexityBot", // Perplexity search
  "Perplexity-User",
  "ClaudeBot", // Anthropic/Claude
  "anthropic-ai",
  "Claude-Web",
  "Google-Extended", // Gemini / Google AI features
  "Applebot-Extended", // Apple Intelligence
  "Bingbot", // Microsoft Copilot / Bing
  "CCBot", // Common Crawl (feeds many LLM training sets)
  "Meta-ExternalAgent", // Meta AI
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOWED_PATHS,
      })),
    ],
    sitemap: "https://ricomatrix.com/sitemap.xml",
    host: "https://ricomatrix.com",
  };
}
