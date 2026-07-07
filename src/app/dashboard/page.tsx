import { getDashboardData } from '@/lib/data';

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Please sign in to view your dashboard.</div>;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Welcome back, {data.user.name}</h1>
        <p className="mt-2 text-sm text-slate-600">Review your borrow activity, reservations, and notifications.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Borrow history</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {data.loans.map((loan) => (
              <li key={loan.id} className="rounded-xl bg-slate-50 p-3">{loan.book.title} — Due {loan.dueDate.toLocaleDateString()}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Notifications</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {data.notifications.map((notification) => (
              <li key={notification.id} className="rounded-xl bg-slate-50 p-3">{notification.message}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
