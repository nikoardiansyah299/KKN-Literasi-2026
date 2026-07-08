const fs = require('fs');
const path = require('path');

const ca = process.env.AIVEN_CA_PEM || process.env.CA_PEM;
if (!ca) {
  console.error('Error: AIVEN_CA_PEM or CA_PEM env var is required to write server/ca.pem.');
  process.exit(1);
}

const outPath = path.join(process.cwd(), 'server', 'ca.pem');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, ca);
console.log(`Wrote Aiven CA to ${outPath}`);
