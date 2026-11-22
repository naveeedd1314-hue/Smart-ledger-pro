
export default function DataBackup() {
  const backup = () => {
    const data: Record<string, string> = {};
    Object.keys(localStorage).filter(k => k.toLowerCase().includes('smartledger')).forEach(k => {
      const value = localStorage.getItem(k);
      if (value !== null) data[k] = value;
    });
    const blob = new Blob([JSON.stringify({ app: 'SmartLedger', version: 1, createdAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartLedger-Backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restore = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result));
        if (backup.app !== 'SmartLedger' || !backup.data || typeof backup.data !== 'object') throw new Error();
        if (!window.confirm('Replace current SmartLedger data with this backup?')) return;
        Object.entries(backup.data).forEach(([key, value]) => {
          if (key.toLowerCase().includes('smartledger') && typeof value === 'string') localStorage.setItem(key, value);
        });
        window.alert('Backup restored. The app will reload.');
        window.location.reload();
      } catch {
        window.alert('Invalid SmartLedger backup file.');
      }
    };
    reader.readAsText(file);
  };

  return <div className="flex flex-wrap gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
    <button type="button" onClick={backup} className="rounded-lg bg-green-900 px-4 py-3 font-semibold text-white">Backup SmartLedger Data</button>
    <label className="cursor-pointer rounded-lg border border-green-900 px-4 py-3 font-semibold text-green-900">
      Restore Backup
      <input type="file" accept=".json,application/json" className="hidden" onChange={e => restore(e.target.files?.[0])} />
    </label>
  </div>;
}
