import { useState } from 'react';
import { localDateISO } from '../lib/dateUtils';
import DataQualityMonitor from '../components/DataQualityMonitor';
import { migrateLegacyData } from '../lib/dataMigration';

const BACKUP_PREFIX = 'smartledger-';

type BusinessSettings = { name:string; phone:string; email:string; address:string; gstin:string; state:string; invoicePrefix:string; financialYear:string; targetMarginPercent:string; logo:string; signature:string };

export default function Settings() {
  const [business, setBusiness] = useState<BusinessSettings>(() => {
    const defaults = { name: 'SmartLedger Business', phone: '', email: '', address: '', gstin: '', state: 'Jammu and Kashmir', invoicePrefix: 'SL', financialYear: '2026-27', targetMarginPercent: '3.5', logo: '', signature: '' };
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('smartledger-pro-settings') || '{}') }; }
    catch { return defaults; }
  });
  const [backupStatus, setBackupStatus] = useState('');
  const [migrationInfo] = useState(() => { try { return JSON.parse(localStorage.getItem('smartledger-pro-migration-v1') || 'null'); } catch { return null; } });
  const migratedSections = Object.entries(migrationInfo?.migrated || {}).map(([key, count]) => `${key.replace('smartledger-pro-', '').replace('smartledger-', '')}: ${count}`).join(' · ');

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
        const validated = entries.map(([key, value]) => {
          const stored = typeof value === 'string' ? value : JSON.stringify(value);
          if (stored === undefined) throw new Error(`Backup section "${key}" cannot be restored.`);
          try { JSON.parse(stored); } catch { throw new Error(`Backup section "${key}" contains invalid data. Nothing was changed.`); }
          return [key, stored] as const;
        });
        if (!window.confirm(`Restore ${validated.length} SmartLedger data sections? Matching current sections will be overwritten. Invalid data is rejected before any changes are made.`)) {
          setBackupStatus('Restore cancelled.');
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
        migrateLegacyData(true);
        setBackupStatus(`Restored ${entries.length} data sections. Refreshing SmartLedger…`);
        window.alert('Backup restored successfully. SmartLedger will now refresh.');
        window.location.reload();
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <label className="block text-sm font-semibold">Business logo</label>
          <p className="mt-1 text-xs text-[var(--text-2)]">PNG or JPG, up to 700 KB. Used on invoices.</p>
          {business.logo && <img src={business.logo} alt="Business logo preview" className="mt-3 h-20 max-w-40 rounded-lg border border-[var(--border)] bg-white object-contain p-2"/>}
          <input type="file" accept="image/png,image/jpeg" className="mt-3 block w-full text-sm" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>700*1024){alert('Choose a logo smaller than 700 KB.');e.currentTarget.value='';return;}const reader=new FileReader();reader.onload=()=>setBusiness(prev=>({...prev,logo:String(reader.result||'')}));reader.readAsDataURL(file);e.currentTarget.value='';}}/>
          {business.logo && <button type="button" onClick={()=>setBusiness(prev=>({...prev,logo:''}))} className="mt-2 text-xs font-semibold text-[var(--rose)]">Remove logo</button>}
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <label className="block text-sm font-semibold">Authorised signature</label>
          <p className="mt-1 text-xs text-[var(--text-2)]">PNG or JPG, up to 700 KB. Printed on sales invoices.</p>
          {business.signature && <img src={business.signature} alt="Signature preview" className="mt-3 h-20 max-w-48 rounded-lg border border-[var(--border)] bg-white object-contain p-2"/>}
          <input type="file" accept="image/png,image/jpeg" className="mt-3 block w-full text-sm" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>700*1024){alert('Choose a signature image smaller than 700 KB.');e.currentTarget.value='';return;}const reader=new FileReader();reader.onload=()=>setBusiness(prev=>({...prev,signature:String(reader.result||'')}));reader.readAsDataURL(file);e.currentTarget.value='';}}/>
          {business.signature && <button type="button" onClick={()=>setBusiness(prev=>({...prev,signature:''}))} className="mt-2 text-xs font-semibold text-[var(--rose)]">Remove signature</button>}
        </div>
      </div>
      <p className="text-xs text-[var(--text-2)]">Products below this margin are flagged in Business Strategy and SmartLedger AI. This is a monitoring threshold, not an automatic price change.</p>
      <button onClick={save} className="rounded-xl bg-[var(--indigo)] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--indigo-ink)]">Save Settings</button>
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-3">
      <h2 className="text-lg font-semibold">Account & Security</h2>
      <p className="text-sm text-[var(--text-2)]">Sign out of this account on this device. Your business records are kept in the account-specific local workspace and restored when you sign back in.</p>
      <button type="button" onClick={() => { if (window.confirm('Sign out of SmartLedger on this device?')) window.dispatchEvent(new Event('smartledger:sign-out')); }} className="rounded-xl border border-rose-300 px-5 py-3 font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40">Sign out</button>
    </div>
    {migrationInfo && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm"><strong>Legacy data migration checked</strong><p className="mt-1 text-[var(--text-2)]">{migratedSections ? `Imported records — ${migratedSections}.` : "No legacy records needed importing."} Original legacy data keys remain preserved on this device.</p></div>}
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-3">
      <h2 className="text-lg font-semibold">Data Backup & Restore</h2>
      <p className="text-sm text-[var(--text-2)]">Export all SmartLedger local records to a portable JSON backup, or restore a backup created by SmartLedger. Existing matching sections are overwritten; unrelated device data is preserved.</p>
      <button onClick={backup} className="rounded-xl bg-[var(--indigo)] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--indigo-ink)]">Download Backup</button>
      <div><label className="block text-sm font-medium">Restore backup<input type="file" accept=".json,application/json" className="mt-2 block w-full text-sm" onChange={e=>{ restore(e.target.files?.[0]); e.currentTarget.value = ''; }}/></label></div>
      {backupStatus && <p role="status" aria-live="polite" className="text-sm text-[var(--text-2)]">{backupStatus}</p>}
    </div>
    <div className="rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/10 p-4 text-sm text-[var(--text)]">Keep backup files secure. Store a copy outside this device. Restoring overwrites matching SmartLedger sections and does not provide cloud synchronisation.</div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-2">
      <h2 className="text-lg font-semibold text-[var(--text)]">Install on Android</h2>
      <p className="text-sm text-[var(--text-2)]">Open SmartLedger Pro in Chrome over HTTPS, open the browser menu and choose Install app or Add to Home screen. The app shell and loaded assets are cached for offline reopening after the first successful visit. This installs the web app, not a Google Play APK.</p>
    </div>
    <DataQualityMonitor />
  </section>;
}
