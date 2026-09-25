'use client';

/**
 * 🌐 + each language's own name. Writes the same language preference as
 * the corner wheel's language face, so every place stays in step.
 * `value` / `onChange` override the preference (the /guide pages use
 * that to follow their URL instead).
 */

import { usePrefs } from '../lib/prefs';
import { LANG_META, LANG_ORDER, t, type LangCode } from '../lib/i18n';

export interface LanguagePickerProps {
  value?: LangCode;
  onChange?: (lang: LangCode) => void;
}

export default function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  const { language, setLanguage } = usePrefs();
  const current = value ?? language;
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#b8f5a0' }}>
      <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>🌐</span>
      <select
        value={current}
        aria-label={t('lang.button', current)}
        onChange={(e) => {
          const lang = e.target.value as LangCode;
          setLanguage(lang);
          onChange?.(lang);
        }}
        style={{ minHeight: 44, padding: '0 10px', background: '#050805', color: '#e6ffe0', border: '1px solid rgba(71,204,36,.45)', borderRadius: 8, font: 'inherit', cursor: 'pointer' }}
      >
        {LANG_ORDER.map((code) => (
          <option key={code} value={code} lang={code}>{LANG_META[code].native}</option>
        ))}
      </select>
    </label>
  );
}
