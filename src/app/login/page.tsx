import { login } from '@/lib/actions';

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">Use the seeded admin or user account to explore both workflows.</p>
      <form action={login} className="mt-6 space-y-4">
        <input name="email" type="email" placeholder="Email" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        <input name="password" type="password" placeholder="Password" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        <button className="w-full rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white">Login</button>
      </form>
      {searchParams && 'error' in searchParams ? <p className="mt-4 text-sm text-red-600">Invalid credentials.</p> : null}
    </div>
  );
}
