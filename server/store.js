// Tiny JSON-file store: no database to install. State lives in server/data/db.json
// and is re-seeded automatically when the file does not exist (or on demo reset).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSeed } from './seed.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const file = path.join(dir, 'db.json');

let db;

function persist() {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}

function load() {
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
