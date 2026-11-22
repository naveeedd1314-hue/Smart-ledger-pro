import { useState } from 'react';

export default function Settings() {
  const [business, setBusiness] = useState(() => {
    const defaults = { name: 'SmartLedger Business', phone: '', email: '', address: '', gstin: '', state: 'Jammu and Kashmir', invoicePrefix: 'SL', financialYear: '2026-27' };
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('smartledger-pro-settings') || '{}') }; }
    catch { return defaults; }
  });

  function save() {
    localStorage.setItem('smartledger-pro-settings', JSON.stringify(business));
    alert('Business settings saved.');
  }

  function backup() {
    const data: Record<string, unknown> = {};
    Object.keys(localStorage).filter(k => k.startsWith('smartledger-')).forEach(k => {
      try { data[k] = JSON.parse(localStorage.getItem(k) || 'null'); } catch {}
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SmartLedger-Backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function restore(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
        if (!confirm('Restore this backup? Existing SmartLedger data may be overwritten.')) return;
        Object.entries(data).forEach(([key, value]) => {
          if (key.startsWith('smartledger-')) localStorage.setItem(key, JSON.stringify(value));
        });
        alert('Backup restored. Reload the app to refresh all screens.');
      } catch {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  }

  return <section className="space-y-5">
    <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-sm text-[var(--text-2)]">Business profile and application preferences.</p></div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold">Business Profile</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ['name','Business name'],
          ['phone','Phone number'],
          ['email','Email address'],
          ['gstin','GSTIN'],
          ['address','Business address'],
          ['state','State'],
          ['invoicePrefix','Invoice prefix'],
          ['financialYear','Financial year']
        ] as const).map(([key,label])=><label key={key} className="text-sm">{label}<input className="mt-1 w-full rounded-lg border p-3" value={business[key]} onChange={e=>setBusiness({...business,[key]:e.target.value})}/></label>)}
      </div>
      <button onClick={save} className="rounded-xl bg-[var(--indigo)] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--indigo-ink)]">Save Settings</button>
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-3">
      <h2 className="text-lg font-semibold">Data Backup & Restore</h2>
      <p className="text-sm text-[var(--text-2)]">Download your locally stored SmartLedger records or restore from a backup JSON file.</p>
      <button onClick={backup} className="rounded-xl bg-[var(--indigo)] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--indigo-ink)]">Download Backup</button>
      <div><label className="block text-sm font-medium">Restore backup<input type="file" accept=".json,application/json" className="mt-2 block w-full text-sm" onChange={e=>restore(e.target.files?.[0])}/></label></div>
    </div>
    <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Keep backup files secure. Restoring can overwrite existing records. This is local-device backup, not cloud synchronisation.</div>
  </section>;
}
