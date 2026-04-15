import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const dataFile = path.join(dataDir, "leagues.json");

let databasePool;
let databaseReadyPromise;

function usingDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

async function ensureDataStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify({ leagues: {} }, null, 2));
  }
}

async function readFileStore() {
  await ensureDataStore();
  const raw = await fs.readFile(dataFile, "utf8");
  return JSON.parse(raw);
}

async function writeFileStore(store) {
  await ensureDataStore();
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2));
}

function getPool() {
  if (!databasePool) {
    databasePool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }

  return databasePool;
}

async function ensureDatabase() {
  if (!usingDatabase()) {
    return;
  }

  if (!databaseReadyPromise) {
    databaseReadyPromise = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS leagues (
          code TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          admin_code TEXT NOT NULL,
          is_locked BOOLEAN NOT NULL DEFAULT FALSE,
          locked_at TIMESTAMPTZ,
          entries JSONB NOT NULL DEFAULT '[]'::jsonb,
          actual_results JSONB
        )
      `);
    })();
  }

  await databaseReadyPromise;
}

function mapLeagueRow(row) {
  if (!row) {
    return null;
  }

  return {
    code: row.code,
    name: row.name,
    createdAt: new Date(row.created_at).toISOString(),
    adminCode: row.admin_code,
    isLocked: row.is_locked,
    lockedAt: row.locked_at ? new Date(row.locked_at).toISOString() : null,
    entries: Array.isArray(row.entries) ? row.entries : [],
    actualResults: row.actual_results ?? null,
  };
}

async function createLeagueRecord(league) {
  if (!usingDatabase()) {
    const store = await readFileStore();
    store.leagues[league.code] = league;
    await writeFileStore(store);
    return league;
  }

  await ensureDatabase();
  const pool = getPool();
  await pool.query(
    `
      INSERT INTO leagues (
        code,
        name,
        created_at,
        admin_code,
        is_locked,
        locked_at,
        entries,
        actual_results
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
    `,
    [
      league.code,
      league.name,
      league.createdAt,
      league.adminCode,
      league.isLocked,
      league.lockedAt,
      JSON.stringify(league.entries),
      JSON.stringify(league.actualResults),
    ]
  );

  return league;
}

async function getLeagueRecord(code) {
  if (!usingDatabase()) {
    const store = await readFileStore();
    return store.leagues[code] ?? null;
  }

  await ensureDatabase();
  const pool = getPool();
  const result = await pool.query("SELECT * FROM leagues WHERE code = $1 LIMIT 1", [code]);
  return mapLeagueRow(result.rows[0]);
}

async function listLeagueCodes() {
  if (!usingDatabase()) {
    const store = await readFileStore();
    return Object.keys(store.leagues);
  }

  await ensureDatabase();
  const pool = getPool();
  const result = await pool.query("SELECT code FROM leagues");
  return result.rows.map((row) => row.code);
}

async function saveLeagueRecord(league) {
  if (!usingDatabase()) {
    const store = await readFileStore();
    store.leagues[league.code] = league;
    await writeFileStore(store);
    return league;
  }

  await ensureDatabase();
  const pool = getPool();
  await pool.query(
    `
      UPDATE leagues
      SET
        name = $2,
        created_at = $3,
        admin_code = $4,
        is_locked = $5,
        locked_at = $6,
        entries = $7::jsonb,
        actual_results = $8::jsonb
      WHERE code = $1
    `,
    [
      league.code,
      league.name,
      league.createdAt,
      league.adminCode,
      league.isLocked,
      league.lockedAt,
      JSON.stringify(league.entries),
      JSON.stringify(league.actualResults),
    ]
  );

  return league;
}

export async function ensureStoreReady() {
  if (usingDatabase()) {
    await ensureDatabase();
    return;
  }

  await ensureDataStore();
}

export async function getExistingLeagueCodes() {
  return listLeagueCodes();
}

export async function createLeague(league) {
  return createLeagueRecord(league);
}

export async function getLeague(code) {
  return getLeagueRecord(code);
}

export async function saveLeague(league) {
  return saveLeagueRecord(league);
}

export function isDatabaseBackedStore() {
  return usingDatabase();
}
