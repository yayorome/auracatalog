// One-time (occasionally re-run) import of the SEPOMEX national postal code
// catalog into the `postal_codes` table. Usage:
//
//   node --env-file=.env.local scripts/import-postal-codes.mjs sepomex.txt
//
// Reads NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env.local
// (same credentials as src/lib/supabase/admin.ts) to bypass RLS for the bulk
// upsert. The source file is SEPOMEX's official pipe-delimited, ISO-8859-1
// encoded catalog: line 1 is a legal notice, line 2 is the header, and the
// rest are data rows.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/import-postal-codes.mjs <path-to-sepomex-file>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

const raw = readFileSync(filePath);
const text = new TextDecoder("iso-8859-1").decode(raw);
const lines = text.split(/\r?\n/).filter((line) => line.length > 0);

// lines[0] = legal notice, lines[1] = header
const dataLines = lines.slice(2);

const seen = new Set();
const rows = [];
for (const line of dataLines) {
  const cols = line.split("|");
  const [d_codigo, d_asenta, , D_mnpio, d_estado, d_ciudad] = cols;
  if (!d_codigo || !d_asenta || !D_mnpio || !d_estado) continue;

  const key = `${d_codigo}|${d_asenta}`;
  if (seen.has(key)) continue; // UNIQUE(postal_code, colonia)
  seen.add(key);

  rows.push({
    postal_code: d_codigo,
    colonia: d_asenta,
    municipio: D_mnpio,
    estado: d_estado,
    city: d_ciudad || null,
  });
}

console.log(`Parsed ${rows.length} rows from ${dataLines.length} data lines.`);

const BATCH_SIZE = 1000;
let inserted = 0;
for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const batch = rows.slice(i, i + BATCH_SIZE);
  const { error } = await supabase
    .from("postal_codes")
    .upsert(batch, { onConflict: "postal_code,colonia" });
  if (error) {
    console.error(`Batch ${i}-${i + batch.length} failed:`, error.message);
    process.exit(1);
  }
  inserted += batch.length;
  process.stdout.write(`\rUpserted ${inserted}/${rows.length}`);
}

console.log("\nDone.");
