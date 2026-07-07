import { getAdminDashboardData } from '@/lib/data';
import { approveBorrowRequest, rejectBorrowRequest, returnLoan, createBook, deleteBook, updateBook, importBooks } from '@/lib/actions';

export default async function AdminPage() {
  const data = await getAdminDashboardData();

  if (!data) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Only administrators can access this area.</div>;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Admin workspace</h1>
        <p className="mt-2 text-sm text-slate-600">Manage catalog records, approve borrowing, and review inventory activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-600">Users</p><p className="text-2xl font-semibold">{data.analytics.users}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-600">Books</p><p className="text-2xl font-semibold">{data.analytics.booksCount}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-600">Active loans</p><p className="text-2xl font-semibold">{data.analytics.activeLoans}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-600">Pending requests</p><p className="text-2xl font-semibold">{data.analytics.pendingRequests}</p></div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Add or update book</h2>
        <form action={createBook} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="title" placeholder="Title" className="rounded-xl border border-slate-200 px-3 py-2" required />
          <input name="author" placeholder="Author" className="rounded-xl border border-slate-200 px-3 py-2" required />
          <input name="catalogNumber" placeholder="Catalog number" className="rounded-xl border border-slate-200 px-3 py-2" required />
          <input name="totalCopies" placeholder="Total copies" className="rounded-xl border border-slate-200 px-3 py-2" required />
          <input name="location" placeholder="Location" className="rounded-xl border border-slate-200 px-3 py-2" />
          <textarea name="description" placeholder="Description" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" />
          <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white md:col-span-2">Create book</button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Inventory</h2>
        <div className="mt-4 space-y-3">
          {data.books.map((book) => (
            <div key={book.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <div>
                <p className="font-medium">{book.title}</p>
                <p className="text-sm text-slate-600">{book.author} • {String(book.catalogNumber).padStart(3, '0')}</p>
              </div>
              <form action={async () => { 'use server'; await deleteBook(book.id); }}><button className="rounded-full border border-slate-300 px-3 py-2 text-sm">Delete</button></form>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Borrow approvals</h2>
        <div className="mt-4 space-y-3">
          {data.requests.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <div>
                <p className="font-medium">{request.book.title}</p>
                <p className="text-sm text-slate-600">Requested by {request.user.name} • {request.status}</p>
              </div>
              {request.status === 'pending' && (
                <div className="flex gap-2">
                  <form action={async () => { 'use server'; await approveBorrowRequest(request.id); }}><button className="rounded-full bg-emerald-600 px-3 py-2 text-sm text-white">Approve</button></form>
                  <form action={async () => { 'use server'; await rejectBorrowRequest(request.id); }}><button className="rounded-full border border-slate-300 px-3 py-2 text-sm">Reject</button></form>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Loan returns</h2>
        <div className="mt-4 space-y-3">
          {data.loans.map((loan) => (
            <div key={loan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <div>
                <p className="font-medium">{loan.book.title}</p>
                <p className="text-sm text-slate-600">Borrowed by {loan.user.name} • Due {loan.dueDate.toLocaleDateString()}</p>
              </div>
              {!loan.returnedAt && <form action={async () => { 'use server'; await returnLoan(loan.id); }}><button className="rounded-full bg-indigo-600 px-3 py-2 text-sm text-white">Mark returned</button></form>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
