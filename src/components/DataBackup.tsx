import { localDateISO } from '../lib/dateUtils';
import { useState } from 'react';

const PREFIX = 'smartledger-';

export default function DataBackup() {
  const [status, setStatus] = useState('');

  const backup = () => {
    const data: Record<string, string> = {};
    Object.keys(localStorage).filter(key => key.startsWith(PREFIX)).forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    });
    if (!Object.keys(data).length) {
      setStatus('No SmartLedger records were found on this device.');
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
    setStatus(`Backup prepared with ${Object.keys(data).length} data sections.`);
  };

  const restore = (file?: File) => {
    if (!file) return;
    setStatus('Checking backup file…');
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
          key.startsWith(PREFIX) && (typeof value === 'string' || value === null || typeof value === 'number' || typeof value === 'boolean' || Array.isArray(value) || (typeof value === 'object' && value !== null))
        );
        if (!entries.length) throw new Error('No valid SmartLedger data was found in this file.');
        const validated = entries.map(([key, value]) => {
          const stored = typeof value === 'string' ? value : JSON.stringify(value);
          if (stored === undefined) throw new Error(`Backup section "${key}" cannot be restored.`);
          try { JSON.parse(stored); } catch { throw new Error(`Backup section "${key}" contains invalid data. Nothing was changed.`); }
          return [key, stored] as const;
        });
        if (!window.confirm(`Restore ${validated.length} SmartLedger data sections? Matching current sections will be overwritten. A recovery snapshot will be kept in memory until the restore finishes.`)) {
          setStatus('Restore cancelled.');
          return;
        }
        const previous = new Map(validated.map(([key]) => [key, localStorage.getItem(key)]));
        try {
          validated.forEach(([key, stored]) => localStorage.setItem(key, stored));
        } catch (error) {
          previous.forEach((value, key) => {
            try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch {}
          });
          throw error;
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Invalid SmartLedger backup file.');
      }
    };
    reader.onerror = () => setStatus('Could not read this file. Try selecting the backup again.');
    reader.readAsText(file);
  };

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div>
        <h2 className="font-semibold text-[var(--text)]">Inventory Data Backup</h2>
        <p className="text-sm text-[var(--text-2)]">Export or restore all SmartLedger records stored on this device.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={backup} className="rounded-xl bg-[var(--indigo)] px-4 py-3 font-semibold text-white">Backup SmartLedger Data</button>
        <label className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-[var(--text)]">
          Restore Backup
          <input type="file" accept=".json,application/json" className="hidden" onChange={e => { restore(e.target.files?.[0]); e.currentTarget.value = ''; }} />
        </label>
      </div>
      {status && <p role="status" aria-live="polite" className="text-sm text-[var(--text-2)]">{status}</p>}
      <p className="text-xs text-[var(--text-2)]">Keep backup files secure. Restoring overwrites matching SmartLedger data sections. This is a local-device backup, not cloud synchronisation.</p>
    </section>
  );
}
