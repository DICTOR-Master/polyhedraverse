'use client';

/**
 * The /guide pages' language picker. The URL decides the language
 * (/guide = English, /guide/ja ...); picking one navigates there and
 * saves it as the app language. Plain /guide opens in the saved language
 * when it isn't English, the same as Rhombiverse's /guide.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LanguagePicker from './LanguagePicker';
import { usePrefs } from '../lib/prefs';
import type { LangCode } from '../lib/i18n';

const pathFor = (lang: string) => (lang === 'en' ? '/guide' : `/guide/${lang}`);

export default function GuidePageLanguage({ lang }: { lang: LangCode }) {
  const router = useRouter();
  const { language } = usePrefs();
  useEffect(() => {
    if (lang === 'en' && language !== 'en') router.replace(pathFor(language));
  }, [lang, language, router]);
  return <LanguagePicker value={lang} onChange={(l) => router.push(pathFor(l))} />;
}
