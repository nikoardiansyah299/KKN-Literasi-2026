const app = require("./server");

async function run() {
  const server = app.listen(0);

  try {
    const port = server.address().port;

    const healthRes = await fetch(`http://127.0.0.1:${port}/api/health`);
    const healthJson = await healthRes.json();
    if (healthJson.status !== "ok") {
      throw new Error("Health check failed");
    }

    const loginRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@library.local", password: "admin123" }),
    });
    const loginJson = await loginRes.json();
    if (!loginJson.token) {
      throw new Error("Login smoke test failed");
    }

    const catalogRes = await fetch(`http://127.0.0.1:${port}/api/catalog?start=0&end=999`);
    const catalogJson = await catalogRes.json();
    if (!Array.isArray(catalogJson.items)) {
      throw new Error("Catalog smoke test failed");
    }

    console.log("Smoke test passed.");
  } finally {
    server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
