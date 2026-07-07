import { register } from '@/lib/actions';

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold">Create account</h1>
      <p className="mt-2 text-sm text-slate-600">Register as a regular library member to request loans and reservations.</p>
      <form action={register} className="mt-6 space-y-4">
        <input name="name" placeholder="Full name" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        <input name="email" type="email" placeholder="Email" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        <input name="password" type="password" placeholder="Password" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        <button className="w-full rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white">Register</button>
      </form>
    </div>
  );
}
