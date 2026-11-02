
// Tiny JSON-file store for local development.
// On Vercel, use temporary in-memory demo data because
// serverless filesystems are not permanent.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSeed } from './seed.js';

const isVercel = process.env.VERCEL === '1';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const file = path.join(dir, 'db.json');

let db;

function persist() {
  // Vercel demo mode: keep changes in memory only.
  if (isVercel) return;

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}

function load() {
  if (isVercel) {
    db = buildSeed();
    return;
  }

  try {
    db = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    db = buildSeed();
    persist();
  }
}

load();

export const getDb = () => db;

export function mutate(fn) {
  const result = fn(db);
  persist();
  return result;
}

export function resetDb() {
  db = buildSeed();
  persist();
  return db;
}

export function nextId(prefix, items, start) {
  const max = items.reduce((m, x) => {
    const n = Number(String(x.id).split('-').pop());
    return Number.isFinite(n) && n > m ? n : m;
  }, start - 1);

  return `${prefix}-${max + 1}`;
}
