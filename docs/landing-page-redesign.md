# Landing Page Redesign Notes

## Stack alignment
- The RicoMatrix landing page redesign lives in `/components/Landingpage/Landingpage.tsx`.
- Styling is driven by `/components/Landingpage/Landingpage.module.css` plus shared theme tokens in `/app/globals.css`.
- Tailwind v4 brand tokens are exposed with `@theme inline` in `/app/globals.css`.

## Fonts
- Display font: `Orbitron`
- Body font: `Inter`
- Both fonts are loaded from Google Fonts inside `/components/Landingpage/Landingpage.module.css`.

## Libraries used
- `framer-motion` is used for section reveals, hero word transitions, and mobile drawer animation.
- `react-simple-maps` continues to power the global map through `/components/WorldMap.tsx`.
- No new npm packages are required beyond the current project dependencies.

## Notes
- Existing landing-page copy, anchor IDs, wallet-connect flow, and external links were preserved.
- Footer external links include website, whitepaper, Telegram, X, YouTube, and email.
