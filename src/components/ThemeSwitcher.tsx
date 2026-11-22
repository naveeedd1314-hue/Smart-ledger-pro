import { useEffect, useState } from 'react';
type Mode = 'light' | 'dark' | 'system';
export default function ThemeSwitcher() {
  const [mode, setMode] = useState<Mode>(() => {
    const v = localStorage.getItem('smartledger-theme-mode');
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  });
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const theme = mode === 'system' ? (media.matches ? 'dark' : 'light') : mode;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    };
    apply();
    localStorage.setItem('smartledger-theme-mode', mode);
    if (mode === 'system') {
      media.addEventListener?.('change', apply);
      return () => media.removeEventListener?.('change', apply);
    }
  }, [mode]);
  return <div className="sl-theme-switcher" role="group" aria-label="Appearance theme">
    {(['light', 'dark', 'system'] as Mode[]).map(v =>
      <button key={v} type="button" aria-pressed={mode === v}
        className={mode === v ? 'sl-theme-option active' : 'sl-theme-option'}
        onClick={() => setMode(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
  </div>;
}
