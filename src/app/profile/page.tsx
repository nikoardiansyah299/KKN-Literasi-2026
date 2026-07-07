import { changePassword } from '@/lib/actions';
import { getDashboardData } from '@/lib/data';

export default async function ProfilePage() {
  const data = await getDashboardData();

  if (!data) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Sign in to manage your profile.</div>;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Profile</h1>
        <p className="mt-2 text-sm text-slate-600">Manage your contact details and password.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Account summary</h2>
        <p className="mt-2 text-sm text-slate-600">Name: {data.user.name}</p>
        <p className="mt-1 text-sm text-slate-600">Email: {data.user.email}</p>
        <p className="mt-1 text-sm text-slate-600">Role: {data.user.role}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Change password</h2>
        <form action={changePassword} className="mt-4 space-y-4">
          <input name="currentPassword" type="password" placeholder="Current password" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
          <input name="newPassword" type="password" placeholder="New password" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
          <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white">Update password</button>
        </form>
      </div>
    </section>
  );
}
