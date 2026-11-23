import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const firebaseReady = Object.values(config).every(value => typeof value === 'string' && value.length > 0);
const firebaseAuth = firebaseReady
  ? getAuth(getApps().length ? getApp() : initializeApp(config))
  : null;

const DATA_PREFIX = 'smartledger';
const RESERVED = new Set([
  'smartledger-auth-initialized',
  'smartledger-active-user',
  'smartledger-offline-session',
]);

function businessKeys(): string[] {
  return Object.keys(localStorage).filter(key =>
    key.startsWith(DATA_PREFIX) &&
    !key.startsWith('smartledger-user:') &&
    !RESERVED.has(key)
  );
}

function activateAccountStorage(uid: string): void {
  const prefix = `smartledger-user:${uid}:`;
  const scopedKeys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
  const initialized = localStorage.getItem('smartledger-auth-initialized') === '1';

  // Preserve the existing device's business records for the first account only.
  if (scopedKeys.length === 0 && !initialized) {
    businessKeys().forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) localStorage.setItem(prefix + key, value);
    });
    localStorage.setItem('smartledger-auth-initialized', '1');
  }

  businessKeys().forEach(key => localStorage.removeItem(key));
  Object.keys(localStorage).filter(key => key.startsWith(prefix)).forEach(key => {
    const value = localStorage.getItem(key);
    if (value !== null) localStorage.setItem(key.slice(prefix.length), value);
  });
  localStorage.setItem('smartledger-active-user', uid);
  localStorage.removeItem('smartledger-offline-session');
}

function saveAccountStorage(uid: string): void {
  const prefix = `smartledger-user:${uid}:`;
  businessKeys().forEach(key => {
    const value = localStorage.getItem(key);
    if (value !== null) localStorage.setItem(prefix + key, value);
    localStorage.removeItem(key);
  });
  localStorage.removeItem('smartledger-active-user');
}

type AuthGateProps = { children: ReactNode };

export default function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [offline, setOffline] = useState(false);
  const [authReady, setAuthReady] = useState(!firebaseReady);
  const [authError, setAuthError] = useState('');
  const activeUid = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const signOutHandler = () => {
      if (firebaseAuth) {
        void signOut(firebaseAuth).catch(error => setAuthError(error instanceof Error ? error.message : 'Sign out failed.'));
      } else {
        localStorage.removeItem('smartledger-offline-session');
        setOffline(false);
      }
    };
    window.addEventListener('smartledger:sign-out', signOutHandler);
    if (!firebaseAuth) {
      return () => window.removeEventListener('smartledger:sign-out', signOutHandler);
    }
    void setPersistence(firebaseAuth, browserLocalPersistence).catch(error => {
      if (mounted) setAuthError(error instanceof Error ? error.message : 'Could not enable persistent login.');
    });
    void getRedirectResult(firebaseAuth).catch(error => {
      if (mounted) setAuthError(error instanceof Error ? error.message : 'Google sign-in could not be completed.');
    });
    const unsubscribe = onAuthStateChanged(firebaseAuth, nextUser => {
      if (!mounted) return;
      if (nextUser) {
        if (activeUid.current && activeUid.current !== nextUser.uid) {
          saveAccountStorage(activeUid.current);
        }
        activateAccountStorage(nextUser.uid);
        activeUid.current = nextUser.uid;
        setUser(nextUser);
        setOffline(false);
      } else {
        if (activeUid.current) {
          saveAccountStorage(activeUid.current);
          activeUid.current = null;
        } else if (localStorage.getItem('smartledger-auth-initialized') === '1') {
          businessKeys().forEach(key => localStorage.removeItem(key));
        }
        setUser(null);
      }
      setAuthReady(true);
    });
    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener('smartledger:sign-out', signOutHandler);
    };
  }, []);

  const continueOffline = () => setOffline(true);

  if (user || offline) return <>{children}</>;
  if (!authReady) {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6 text-sm text-[var(--text-2)]">Preparing secure sign-in…</div>;
  }

  return <LoginScreen
    enabled={firebaseReady && !!firebaseAuth}
    error={authError}
    onError={setAuthError}
    onOffline={continueOffline}
  />;
}

type LoginScreenProps = {
  enabled: boolean;
  error: string;
  onError: (message: string) => void;
  onOffline: () => void;
};

function LoginScreen({ enabled, error, onError, onOffline }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const run = async (action: () => Promise<unknown>) => {
    if (!firebaseAuth || !enabled) return;
    setBusy(true);
    onError('');
    setNotice('');
    try {
      await action();
    } catch (reason) {
      const code = typeof reason === 'object' && reason !== null && 'code' in reason ? String(reason.code) : '';
      const messages: Record<string, string> = {
        'auth/invalid-email': 'Enter a valid email address.',
        'auth/invalid-credential': 'Email or password is incorrect.',
        'auth/user-not-found': 'No account was found for this email.',
        'auth/wrong-password': 'Email or password is incorrect.',
        'auth/email-already-in-use': 'An account already exists for this email.',
        'auth/weak-password': 'Use a password with at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/popup-blocked': 'Google sign-in popup was blocked. Retrying with redirect…',
      };
      onError(messages[code] || (reason instanceof Error ? reason.message : 'Sign-in failed. Please try again.'));
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(firebaseAuth, new GoogleAuthProvider());
        } catch (redirectError) {
          onError(redirectError instanceof Error ? redirectError.message : 'Google sign-in could not be started.');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const emailAction = () => run(() => mode === 'register'
    ? createUserWithEmailAndPassword(firebaseAuth!, email.trim(), password)
    : signInWithEmailAndPassword(firebaseAuth!, email.trim(), password));

  const googleAction = () => run(() => signInWithPopup(firebaseAuth!, new GoogleAuthProvider()));

  const resetPassword = () => run(async () => {
    await sendPasswordResetEmail(firebaseAuth!, email.trim());
    setNotice('Password reset instructions have been sent to your email.');
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100 via-[var(--bg)] to-[var(--bg)] px-4 py-8 dark:from-emerald-950/40">
      <section className="w-full max-w-md overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="bg-gradient-to-br from-[#0D332D] via-[#155B4B] to-[#102C38] px-7 py-8 text-center text-white">
          <img src={`${import.meta.env.BASE_URL}smartledger-mark.svg`} alt="SmartLedger Pro" className="mx-auto h-20 w-20 rounded-2xl shadow-xl" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">SmartLedger Pro</h1>
          <p className="mt-1 text-sm text-emerald-100">Your business. Your numbers. Your growth.</p>
        </div>
        <div className="space-y-5 p-6 sm:p-7">
          <div>
            <h2 className="text-xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="mt-1 text-sm text-[var(--text-2)]">Sign in to access your business workspace.</p>
          </div>
          <button type="button" disabled={!enabled || busy} onClick={() => void googleAction()} className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-semibold text-[var(--text)] transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50">
            <span className="text-lg font-bold">G</span> Continue with Google
          </button>
          <div className="flex items-center gap-3 text-xs text-[var(--text-2)]"><span className="h-px flex-1 bg-[var(--border)]"/><span>OR WITH EMAIL</span><span className="h-px flex-1 bg-[var(--border)]"/></div>
          <form className="space-y-3" onSubmit={event => { event.preventDefault(); void emailAction(); }}>
            <label className="block text-sm font-medium">Email address
              <input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text)]"/>
            </label>
            <label className="block text-sm font-medium">Password
              <input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters" className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text)]"/>
            </label>
            <button type="submit" disabled={!enabled || busy} className="w-full rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 px-4 py-3 font-bold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); onError(''); }} className="font-semibold text-emerald-700 dark:text-emerald-300">{mode === 'login' ? 'Create an account' : 'Already have an account? Sign in'}</button>
            {mode === 'login' && <button type="button" disabled={!enabled || !email.trim() || busy} onClick={() => void resetPassword()} className="text-[var(--text-2)] underline disabled:opacity-40">Forgot password?</button>}
          </div>
          {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
          {notice && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{notice}</p>}
          {!enabled && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Online account sign-in is not connected yet. Firebase project settings are required to activate Google and email login. You can continue in offline mode for now.</div>}
          <button type="button" onClick={onOffline} className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text-2)] transition hover:bg-[var(--surface-2)]">Continue in offline mode</button>
          <p className="text-center text-[11px] text-[var(--text-2)]">Your records stay on this device while using offline mode.</p>
        </div>
      </section>
    </main>
  );
}
