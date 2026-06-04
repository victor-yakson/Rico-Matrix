'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { locales, type Locale } from '../../i18n/config';    // adjust if needed
import { setLocale } from '../../app/actions/setLocale';      // adjust if needed

export function LanguageSwitcher() {
  const activeLocale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const handleChange = (locale: Locale) => {
    if (locale === activeLocale) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      await setLocale(locale);
      setOpen(false);
      router.refresh();
    });
  };

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div
      ref={dropdownRef}
      className="relative flex items-center"
    >
      {/* Trigger button */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 items-center gap-2 rounded-full border border-white/8 bg-[linear-gradient(135deg,rgba(11,16,27,0.92),rgba(7,10,17,0.82))] px-3.5 text-xs font-semibold text-slate-100 shadow-[0_14px_30px_rgba(0,0,0,0.28)] transition hover:border-[rgba(241,210,133,0.28)] hover:text-[var(--primary)]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-base" aria-hidden="true">
          🌐
        </span>
        <span className="tracking-wide">
          {activeLocale.toUpperCase()}
        </span>
        <span
          className={`ml-0.5 inline-block text-[0.65rem] transition-transform ${
            open ? 'rotate-180' : 'rotate-0'
          }`}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {/* Dropdown menu – now positioned under the trigger */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-32 rounded-2xl border border-white/8 bg-[rgba(6,9,15,0.96)] shadow-[0_22px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <ul
            role="listbox"
            className="py-1.5 text-xs text-slate-100"
          >
            {locales.map((locale) => {
              const isActive = locale === activeLocale;
              return (
                <li key={locale}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleChange(locale)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                      isActive
                        ? 'bg-[linear-gradient(135deg,rgba(241,210,133,0.14),rgba(66,137,255,0.16))] text-[var(--primary)]'
                        : 'text-slate-200 hover:bg-white/4 hover:text-[var(--accent)]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="text-[0.9rem]" aria-hidden="true">
                        🌐
                      </span>
                      <span className="font-semibold">
                        {locale.toUpperCase()}
                      </span>
                    </span>
                    {isActive && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
