import { useState } from 'react';
import { localDateISO } from '../lib/dateUtils';
import DataQualityMonitor from '../components/DataQualityMonitor';

const BACKUP_PREFIX = 'smartledger-';

export default function Settings() {
  const [business, setBusiness] = useState(() => {
    const defaults = { name: 'SmartLedger Business', phone: '', email: '', address: '', gstin: '', state: 'Jammu and Kashmir', invoicePrefix: 'SL', financialYear: '2026-27', targetMarginPercent: '3.5' };
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('smartledger-pro-settings') || '{}') }; }
    catch { return defaults; }
  });
  const [backupStatus, setBackupStatus] = useState('');

  function save() {
    const targetMargin = Number(business.targetMarginPercent);
    if (!Number.isFinite(targetMargin) || targetMargin < 0 || targetMargin > 100) { alert('Minimum gross margin must be between 0 and 100%.'); return; }
    localStorage.setItem('smartledger-pro-settings', JSON.stringify(business));
    alert('Business settings saved.');
  }

  function backup() {
    const data: Record<string, string> = {};
    Object.keys(localStorage).filter(key => key.startsWith(BACKUP_PREFIX)).forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    });
    if (!Object.keys(data).length) {
      setBackupStatus('No SmartLedger records were found on this device.');
      return;
    }
    const payload = { app: 'SmartLedger', version: 1, createdAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SmartLedger-Backup-${localDateISO()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupStatus(`Backup prepared with ${Object.keys(data).length} data sections.`);
  }

  function restore(file?: File) {
    if (!file) return;
    setBackupStatus('Checking backup file…');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid backup structure.');
        const root = parsed as Record<string, unknown>;
        const source = root.app === 'SmartLedger' && root.data && typeof root.data === 'object' && !Array.isArray(root.data)
          ? root.data as Record<string, unknown>
          : root;
        const entries = Object.entries(source).filter(([key, value]) =>
          key.startsWith(BACKUP_PREFIX) && (typeof value === 'string' || value === null || typeof value === 'number' || typeof value === 'boolean' || Array.isArray(value) || (typeof value === 'object' && value !== null))
        );
        if (!entries.length) throw new Error('No valid SmartLedger data was found in this file.');
        if (!window.confirm(`Restore ${entries.length} SmartLedger data sections? Matching current sections will be overwritten. Other device data will remain unchanged.`)) {
          setBackupStatus('Restore cancelled.');
          return;
        }
        entries.forEach(([key, value]) => {
          const stored = typeof value === 'string' ? value : JSON.stringify(value);
          if (stored !== undefined) localStorage.setItem(key, stored);
        });
        setBackupStatus(`Restored ${entries.length} data sections. Reload the app to refresh all screens.`);
        window.alert('Backup restored. Reload the app to refresh all screens.');
      } catch (error) {
        setBackupStatus(error instanceof Error ? error.message : 'Invalid backup file.');
      }
    };
    reader.onerror = () => setBackupStatus('Could not read this file. Try selecting the backup again.');
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
          ['financialYear','Financial year'],
          ['targetMarginPercent','Minimum gross margin (%)']
        ] as const).map(([key,label])=><label key={key} className="text-sm">{label}<input type={key === 'targetMarginPercent' ? 'number' : 'text'} min={key === 'targetMarginPercent' ? 0 : undefined} max={key === 'targetMarginPercent' ? 100 : undefined} step={key === 'targetMarginPercent' ? 0.1 : undefined} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[var(--text)]" value={business[key]} onChange={e=>setBusiness({...business,[key]:e.target.value})}/></label>)}
      </div>
      <p className="text-xs text-[var(--text-2)]">Products below this margin are flagged in Business Strategy and SmartLedger AI. This is a monitoring threshold, not an automatic price change.</p>
      <button onClick={save} className="rounded-xl bg-[var(--indigo)] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--indigo-ink)]">Save Settings</button>
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-3">
      <h2 className="text-lg font-semibold">Data Backup & Restore</h2>
      <p className="text-sm text-[var(--text-2)]">Export all SmartLedger local records to a portable JSON backup, or restore a backup created by SmartLedger. Existing matching sections are overwritten; unrelated device data is preserved.</p>
      <button onClick={backup} className="rounded-xl bg-[var(--indigo)] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--indigo-ink)]">Download Backup</button>
      <div><label className="block text-sm font-medium">Restore backup<input type="file" accept=".json,application/json" className="mt-2 block w-full text-sm" onChange={e=>{ restore(e.target.files?.[0]); e.currentTarget.value = ''; }}/></label></div>
      {backupStatus && <p role="status" aria-live="polite" className="text-sm text-[var(--text-2)]">{backupStatus}</p>}
    </div>
    <div className="rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/10 p-4 text-sm text-[var(--text)]">Keep backup files secure. Store a copy outside this device. Restoring overwrites matching SmartLedger sections and does not provide cloud synchronisation.</div>
    <DataQualityMonitor />
  </section>;
}
