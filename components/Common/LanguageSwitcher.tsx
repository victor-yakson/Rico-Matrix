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
        className="flex h-9 items-center gap-1 rounded-full bg-slate-900/70 border border-yellow-500/40 px-3 text-xs font-medium text-slate-100 shadow-[0_0_12px_rgba(0,0,0,0.7)] hover:border-yellow-400 hover:text-yellow-200 hover:bg-yellow-500/10 transition-colors"
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
        <div className="absolute right-0 top-full mt-1 w-32 rounded-xl border border-yellow-500/40 bg-black/95 shadow-[0_12px_30px_rgba(0,0,0,0.95)] backdrop-blur-lg z-50">
          <ul
            role="listbox"
            className="py-1 text-xs text-slate-100"
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
                        ? 'bg-yellow-500/15 text-yellow-300'
                        : 'hover:bg-yellow-500/10 hover:text-yellow-200 text-slate-200'
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
                        className="w-1.5 h-1.5 rounded-full bg-yellow-300"
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
