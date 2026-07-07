const fs = require('fs');
const path = require('path');

const ca = process.env.AIVEN_CA_PEM || process.env.CA_PEM;
if (!ca) {
  console.log('No AIVEN_CA_PEM/CA_PEM env var set — skipping CA write.');
  process.exit(0);
}

const outPath = path.join(process.cwd(), 'server', 'ca.pem');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, ca);
console.log(`Wrote Aiven CA to ${outPath}`);
