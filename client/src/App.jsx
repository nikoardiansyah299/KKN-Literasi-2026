import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { fallbackBooks } from "./fallbackBooks";

const API_BASE = import.meta.env.VITE_API_BASE || (typeof window !== "undefined" ? `${window.location.origin}/api` : "/api");

async function api(path, options = {}, token = null) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_error) {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return payload ?? {};
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("library_token") || "");
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("library_user") || "null")
  );

  const [view, setView] = useState("home");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [catalog, setCatalog] = useState([]);
  const [catalogMeta, setCatalogMeta] = useState({ page: 1, pageSize: 12, total: 0 });
  const [search, setSearch] = useState("");
  const [startRange, setStartRange] = useState("000");
  const [endRange, setEndRange] = useState("999");

  const [adminBooks, setAdminBooks] = useState([]);
  const [borrowRequests, setBorrowRequests] = useState([]);
  const [loans, setLoans] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "" });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [bookForm, setBookForm] = useState({
    id: null,
    title: "",
    author: "",
    catalogNumber: "000",
    totalCopies: "1",
    description: "",
  });

  const isAdmin = user?.role === "admin";
  const isUser = user?.role === "user";

  const navItems = useMemo(() => {
    const base = [
      ["home", "Home"],
      ["catalog", "Catalog"],
    ];

    if (!user) {
      return [
        ...base,
        ["login", "Login"],
        ["register", "Register"],
      ];
    }

    if (isUser) {
      return [
        ...base,
        ["my-loans", "My Borrow History"],
        ["notifications", "Notifications"],
      ];
    }

    return [
      ...base,
      ["admin-books", "Admin Books"],
      ["admin-approvals", "Borrow Approvals"],
      ["admin-analytics", "Analytics"],
    ];
  }, [isAdmin, isUser, user]);

  function resetFeedback() {
    setError("");
    setMessage("");
  }

  async function loadCatalog(page = 1, attempt = 0) {
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "12",
        start: String(Number(startRange) || 0),
        end: String(Number(endRange) || 999),
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }
      const data = await api(`/catalog?${params.toString()}`);
      setCatalog(data.items || []);
      setCatalogMeta({ page: data.page || 1, pageSize: data.pageSize || 12, total: data.total || 0 });
    } catch (err) {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return loadCatalog(page, 1);
      }

      setCatalog(fallbackBooks);
      setCatalogMeta({ page: 1, pageSize: 12, total: fallbackBooks.length });
      setError(err.message || "Using local fallback catalog because the API is unavailable.");
    }
  }

  async function loadAdminBooks() {
    if (!token || !isAdmin) return;
    try {
      const data = await api("/admin/books", {}, token);
      setAdminBooks(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadAdminApprovals() {
    if (!token || !isAdmin) return;
    try {
      const [requests, allLoans] = await Promise.all([
        api("/admin/borrow-requests", {}, token),
        api("/admin/loans", {}, token),
      ]);
      setBorrowRequests(requests);
      setLoans(allLoans);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadUserData() {
    if (!token || !isUser) return;
    try {
      const [userLoans, userNotifications] = await Promise.allSettled([
        api("/me/loans", {}, token),
        api("/me/notifications", {}, token),
      ]);

      if (userLoans.status === "fulfilled") {
        setLoans(userLoans.value);
      }
      if (userNotifications.status === "fulfilled") {
        setNotifications(userNotifications.value);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadAnalytics() {
    if (!token || !isAdmin) return;
    try {
      const data = await api("/admin/analytics", {}, token);
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadCatalog(1);
  }, []);

  useEffect(() => {
    if (view === "catalog") {
      loadCatalog(1);
    }
    if (view === "admin-books") {
      loadAdminBooks();
    }
    if (view === "admin-approvals") {
      loadAdminApprovals();
    }
    if (view === "my-loans" || view === "notifications") {
      loadUserData();
    }
    if (view === "admin-analytics") {
      loadAnalytics();
    }
  }, [view]);

  function saveAuth(authToken, authUser) {
    setToken(authToken);
    setUser(authUser);
    localStorage.setItem("library_token", authToken);
    localStorage.setItem("library_user", JSON.stringify(authUser));
  }

  function logout() {
    setToken("");
    setUser(null);
    localStorage.removeItem("library_token");
    localStorage.removeItem("library_user");
    setView("home");
    resetFeedback();
  }

  async function handleRegister(event) {
    event.preventDefault();
    resetFeedback();
    try {
      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(registerForm),
      });
      saveAuth(data.token, data.user);
      setMessage("Registration successful.");
      setView("catalog");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    resetFeedback();
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });
      saveAuth(data.token, data.user);
      setMessage(`Welcome, ${data.user.name}.`);
      setView(data.user.role === "admin" ? "admin-books" : "catalog");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRequestBorrow(bookId) {
    resetFeedback();
    if (!token || !isUser) {
      setError("Please login as user to request borrowing.");
      return;
    }

    try {
      await api(
        "/borrow-requests",
        {
          method: "POST",
          body: JSON.stringify({ bookId }),
        },
        token
      );
      setMessage("Borrow request submitted.");
      await loadCatalog(catalogMeta.page || 1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReserve(bookId) {
    resetFeedback();
    if (!token || !isUser) {
      setError("Please login as user to reserve books.");
      return;
    }
    try {
      await api(
        "/reservations",
        {
          method: "POST",
          body: JSON.stringify({ bookId }),
        },
        token
      );
      setMessage("Reservation created.");
      await loadCatalog(catalogMeta.page || 1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveBook(event) {
    event.preventDefault();
    resetFeedback();
    try {
      const payload = {
        title: bookForm.title,
        author: bookForm.author,
        catalogNumber: Number(bookForm.catalogNumber),
        totalCopies: Number(bookForm.totalCopies),
        description: bookForm.description,
      };

      if (bookForm.id) {
        await api(`/admin/books/${bookForm.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        }, token);
        setMessage("Book updated.");
      } else {
        await api("/admin/books", {
          method: "POST",
          body: JSON.stringify(payload),
        }, token);
        setMessage("Book added.");
      }

      setBookForm({
        id: null,
        title: "",
        author: "",
        catalogNumber: "000",
        totalCopies: "1",
        description: "",
      });

      await Promise.all([loadAdminBooks(), loadCatalog(catalogMeta.page || 1)]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteBook(id) {
    resetFeedback();
    try {
      await api(`/admin/books/${id}`, { method: "DELETE" }, token);
      setMessage("Book deleted.");
      await Promise.all([loadAdminBooks(), loadCatalog(catalogMeta.page || 1)]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleImportSample() {
    resetFeedback();
    const sample = [
      {
        title: "Community Learning Guide",
        author: "Dina Harsono",
        catalogNumber: 302,
        totalCopies: 2,
        description: "Collaboration and learning facilitation.",
      },
      {
        title: "Agriculture for Youth",
        author: "Rian Kusuma",
        catalogNumber: 630,
        totalCopies: 3,
        description: "Sustainable agriculture handbook.",
      },
    ];

    try {
      await api("/admin/books/import", { method: "POST", body: JSON.stringify(sample) }, token);
      setMessage("Sample import successful.");
      await Promise.all([loadAdminBooks(), loadCatalog(catalogMeta.page || 1)]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleExportBooks() {
    resetFeedback();
    try {
      const data = await api("/admin/books/export", {}, token);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "library-books-export.json";
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleApprove(id) {
    resetFeedback();
    try {
      await api(`/admin/borrow-requests/${id}/approve`, { method: "POST" }, token);
      setMessage("Request approved.");
      await loadAdminApprovals();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReject(id) {
    resetFeedback();
    try {
      await api(`/admin/borrow-requests/${id}/reject`, { method: "POST" }, token);
      setMessage("Request rejected.");
      await loadAdminApprovals();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReturnLoan(id) {
    resetFeedback();
    try {
      const result = await api(`/admin/loans/${id}/return`, { method: "POST" }, token);
      setMessage(`Return saved. Late fee: Rp ${result.lateFee}`);
      await loadAdminApprovals();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">KKN Literasi 2026</p>
          <h1>Library Catalog Portal</h1>
        </div>
        <div className="auth-chip">
          {user ? (
            <>
              <span>{user.name} ({user.role})</span>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <span>Guest</span>
          )}
        </div>
      </header>

      <nav className="nav-grid">
        {navItems.map(([key, label]) => (
          <button
            key={key}
            className={view === key ? "active" : ""}
            onClick={() => {
              resetFeedback();
              setView(key);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}

      {view === "home" && (
        <section className="panel">
          <h2>Digital Library Welcome Page</h2>
          <p>
            Browse books by catalog numbers 000-999, submit borrow requests, and track availability in one system for both users and admins.
          </p>
          <div className="stats-row">
            <article>
              <strong>Public features</strong>
              <p>Homepage, header, footer, and searchable catalog.</p>
            </article>
            <article>
              <strong>User features</strong>
              <p>Register/login, borrow requests, reservations, history, notifications.</p>
            </article>
            <article>
              <strong>Admin features</strong>
              <p>Book CRUD, import/export, approvals, returns, analytics, late fees.</p>
            </article>
          </div>
        </section>
      )}

      {view === "register" && (
        <section className="panel">
          <h2>Register User Account</h2>
          <form className="form-grid" onSubmit={handleRegister}>
            <input
              placeholder="Full name"
              value={registerForm.name}
              onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={registerForm.password}
              onChange={(e) =>
                setRegisterForm((prev) => ({ ...prev, password: e.target.value }))
              }
              required
            />
            <button type="submit">Register</button>
          </form>
        </section>
      )}

      {view === "login" && (
        <section className="panel">
          <h2>Login</h2>
          <p className="hint">Admin seed: admin@library.local / admin123</p>
          <p className="hint">User seed: user@library.local / user123</p>
          <form className="form-grid" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={loginForm.email}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
            <button type="submit">Login</button>
          </form>
        </section>
      )}

      {view === "catalog" && (
        <section className="panel">
          <h2>Catalog Browser (000-999)</h2>
          <form
            className="catalog-filter"
            onSubmit={(e) => {
              e.preventDefault();
              loadCatalog(1);
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or author"
            />
            <input
              value={startRange}
              onChange={(e) => setStartRange(e.target.value)}
              placeholder="Start (000)"
            />
            <input value={endRange} onChange={(e) => setEndRange(e.target.value)} placeholder="End (999)" />
            <button type="submit">Apply</button>
          </form>

          <div className="cards">
            {catalog.map((book) => (
              <article key={book.id} className="card">
                <p className="catalog-tag">{book.catalog_number_label}</p>
                <h3>{book.title}</h3>
                <p>{book.author}</p>
                <p className="description">{book.description}</p>
                <p>
                  Status: <strong>{book.availability.status}</strong> | Available: {book.availability.availableCopies}/{book.availability.totalCopies}
                </p>
                <div className="row-actions">
                  {isUser && <button onClick={() => handleRequestBorrow(book.id)}>Borrow</button>}
                  {isUser && <button onClick={() => handleReserve(book.id)}>Reserve</button>}
                </div>
              </article>
            ))}
          </div>

          <div className="pager">
            <button
              disabled={catalogMeta.page <= 1}
              onClick={() => loadCatalog(catalogMeta.page - 1)}
            >
              Prev
            </button>
            <span>
              Page {catalogMeta.page} of {Math.max(Math.ceil(catalogMeta.total / catalogMeta.pageSize), 1)}
            </span>
            <button
              disabled={catalogMeta.page * catalogMeta.pageSize >= catalogMeta.total}
              onClick={() => loadCatalog(catalogMeta.page + 1)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {view === "admin-books" && isAdmin && (
        <section className="panel">
          <h2>Admin Book Management</h2>
          <form className="form-grid" onSubmit={handleSaveBook}>
            <input
              value={bookForm.title}
              onChange={(e) => setBookForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Title"
              required
            />
            <input
              value={bookForm.author}
              onChange={(e) => setBookForm((prev) => ({ ...prev, author: e.target.value }))}
              placeholder="Author"
              required
            />
            <input
              value={bookForm.catalogNumber}
              onChange={(e) =>
                setBookForm((prev) => ({ ...prev, catalogNumber: e.target.value }))
              }
              placeholder="Catalog Number"
              required
            />
            <input
              value={bookForm.totalCopies}
              onChange={(e) => setBookForm((prev) => ({ ...prev, totalCopies: e.target.value }))}
              placeholder="Total Copies"
              required
            />
            <textarea
              value={bookForm.description}
              onChange={(e) =>
                setBookForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Description"
            />
            <button type="submit">{bookForm.id ? "Update Book" : "Add Book"}</button>
          </form>

          <div className="row-actions space-bottom">
            <button onClick={handleImportSample}>Import Sample</button>
            <button onClick={handleExportBooks}>Export JSON</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Catalog</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Availability</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminBooks.map((book) => (
                  <tr key={book.id}>
                    <td>{book.catalog_number_label}</td>
                    <td>{book.title}</td>
                    <td>{book.author}</td>
                    <td>
                      {book.availability.availableCopies}/{book.availability.totalCopies}
                    </td>
                    <td className="row-actions">
                      <button
                        onClick={() =>
                          setBookForm({
                            id: book.id,
                            title: book.title,
                            author: book.author,
                            catalogNumber: String(book.catalog_number),
                            totalCopies: String(book.total_copies),
                            description: book.description,
                          })
                        }
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDeleteBook(book.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === "admin-approvals" && isAdmin && (
        <section className="panel">
          <h2>Borrow Approval & Return Management</h2>
          <h3>Requests</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Book</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {borrowRequests.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.user_name}</td>
                    <td>{item.book_title}</td>
                    <td>{item.status}</td>
                    <td className="row-actions">
                      {item.status === "pending" && <button onClick={() => handleApprove(item.id)}>Approve</button>}
                      {item.status === "pending" && <button onClick={() => handleReject(item.id)}>Reject</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Loans & Late Fees</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>User</th>
                  <th>Book</th>
                  <th>Due Date</th>
                  <th>Late Fee</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id}>
                    <td>{loan.id}</td>
                    <td>{loan.user_name}</td>
                    <td>{loan.book_title}</td>
                    <td>{new Date(loan.due_date).toLocaleDateString()}</td>
                    <td>Rp {loan.late_fee}</td>
                    <td className="row-actions">
                      {!loan.returned_at && <button onClick={() => handleReturnLoan(loan.id)}>Mark Returned</button>}
                      {loan.returned_at && <span>Returned</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === "my-loans" && isUser && (
        <section className="panel">
          <h2>User Borrow History</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Catalog</th>
                  <th>Due Date</th>
                  <th>Returned At</th>
                  <th>Late Fee</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id}>
                    <td>{loan.title}</td>
                    <td>{String(loan.catalog_number).padStart(3, "0")}</td>
                    <td>{new Date(loan.due_date).toLocaleDateString()}</td>
                    <td>{loan.returned_at ? new Date(loan.returned_at).toLocaleDateString() : "Not yet"}</td>
                    <td>Rp {loan.late_fee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === "notifications" && isUser && (
        <section className="panel">
          <h2>Notifications</h2>
          <ul className="notice-list">
            {notifications.map((n) => (
              <li key={n.id}>
                <p>{n.message}</p>
                <small>{new Date(n.created_at).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === "admin-analytics" && isAdmin && analytics && (
        <section className="panel">
          <h2>Admin Analytics</h2>
          <div className="stats-row">
            <article>
              <strong>Total Users</strong>
              <p>{analytics.totals.users}</p>
            </article>
            <article>
              <strong>Total Books</strong>
              <p>{analytics.totals.books}</p>
            </article>
            <article>
              <strong>Active Loans</strong>
              <p>{analytics.totals.activeLoans}</p>
            </article>
            <article>
              <strong>Overdue Loans</strong>
              <p>{analytics.totals.overdueLoans}</p>
            </article>
            <article>
              <strong>Pending Requests</strong>
              <p>{analytics.totals.pendingRequests}</p>
            </article>
            <article>
              <strong>Total Late Fees</strong>
              <p>Rp {analytics.totalLateFees}</p>
            </article>
          </div>

          <h3>Most Borrowed Books</h3>
          <ul className="notice-list">
            {analytics.mostBorrowed.map((book) => (
              <li key={book.id}>
                <p>{book.title}</p>
                <small>Borrowed {book.borrow_count} times</small>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="footer">
        <p>Library Catalog Portal • Built for user and admin workflows</p>
      </footer>
    </div>
  );
}

export default App;
