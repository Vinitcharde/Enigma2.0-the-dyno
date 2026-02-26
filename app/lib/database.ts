import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Store DB in project root
const DB_PATH = path.join(process.cwd(), 'placeai.db');

let _db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  // Create tables
  _db.exec(`
    CREATE TABLE IF NOT EXISTS resume_analyses (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email      TEXT NOT NULL,
      filename        TEXT NOT NULL,
      file_hash       TEXT NOT NULL,
      analyzed_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      ats_score       INTEGER,
      grade           TEXT,
      technical_score INTEGER,
      communication_score INTEGER,
      skills          TEXT,   -- JSON array
      suggested_roles TEXT,   -- JSON array
      full_analysis   TEXT    -- Full JSON blob
    );

    CREATE TABLE IF NOT EXISTS user_skills (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email  TEXT NOT NULL,
      skill       TEXT NOT NULL,
      added_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_email, skill)
    );

    CREATE INDEX IF NOT EXISTS idx_resume_email ON resume_analyses(user_email);
    CREATE INDEX IF NOT EXISTS idx_resume_hash  ON resume_analyses(file_hash);
  `);

  return _db;
}

export function saveResumeAnalysis(
  userEmail: string,
  filename: string,
  fileHash: string,
  analysis: any
) {
  const db = getDB();
  const skills = analysis.extracted?.skills || [];
  const suggestedRoles = analysis.extracted?.suggestedRoles || [];

  db.prepare(`
    INSERT INTO resume_analyses
      (user_email, filename, file_hash, ats_score, grade, technical_score, communication_score, skills, suggested_roles, full_analysis)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userEmail,
    filename,
    fileHash,
    analysis.ats?.score ?? 0,
    analysis.ats?.grade ?? 'C',
    analysis.extracted?.technicalScore ?? 0,
    analysis.extracted?.communicationScore ?? 0,
    JSON.stringify(skills),
    JSON.stringify(suggestedRoles),
    JSON.stringify(analysis)
  );

  // Upsert skills
  const upsert = db.prepare(`
    INSERT OR IGNORE INTO user_skills (user_email, skill) VALUES (?, ?)
  `);
  const insertMany = db.transaction((s: string[]) => {
    for (const sk of s) upsert.run(userEmail, sk);
  });
  insertMany(skills);
}

export function getCachedAnalysis(fileHash: string) {
  const db = getDB();
  const row = db.prepare(
    `SELECT full_analysis FROM resume_analyses WHERE file_hash = ? ORDER BY analyzed_at DESC LIMIT 1`
  ).get(fileHash) as { full_analysis: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.full_analysis);
}

export function getUserSkills(userEmail: string): string[] {
  const db = getDB();
  const rows = db.prepare(
    `SELECT skill FROM user_skills WHERE user_email = ? ORDER BY added_at DESC`
  ).all(userEmail) as { skill: string }[];
  return rows.map(r => r.skill);
}

export function getLatestAnalysis(userEmail: string) {
  const db = getDB();
  const row = db.prepare(
    `SELECT full_analysis FROM resume_analyses WHERE user_email = ? ORDER BY analyzed_at DESC LIMIT 1`
  ).get(userEmail) as { full_analysis: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.full_analysis);
}
