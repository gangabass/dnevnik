import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// The subset of D1 used by PushStore. Batch executes synchronously inside one
// transaction: no request can interleave writes while the transaction is open.
export class SqliteDatabase {
  constructor(filename, migrations) {
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
    this.sql = new DatabaseSync(filename);
    this.sql.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    this.sql.exec('CREATE TABLE IF NOT EXISTS server_migrations (name TEXT PRIMARY KEY)');
    for (const name of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) {
      if (this.sql.prepare('SELECT name FROM server_migrations WHERE name=?').get(name)) continue;
      this.sql.exec('BEGIN IMMEDIATE');
      try {
        this.sql.exec(readFileSync(join(migrations, name), 'utf8'));
        this.sql.prepare('INSERT INTO server_migrations(name) VALUES (?)').run(name);
        this.sql.exec('COMMIT');
      } catch (error) { this.sql.exec('ROLLBACK'); throw error; }
    }
  }
  prepare(query) {
    const statement = this.sql.prepare(query);
    const wrap = (params = []) => ({
      bind: (...values) => wrap(values),
      first: async (column) => {
        const row = statement.get(...params);
        return row ? (column ? row[column] : row) : null;
      },
      all: async () => ({ results: statement.all(...params), success: true }),
      execute: () => ({ success: true, meta: { changes: Number(statement.run(...params).changes) } }),
      run: async () => wrap(params).execute(),
    });
    return wrap();
  }
  async batch(statements) {
    this.sql.exec('BEGIN IMMEDIATE');
    try {
      const result = statements.map(statement => statement.execute());
      this.sql.exec('COMMIT');
      return result;
    } catch (error) { this.sql.exec('ROLLBACK'); throw error; }
  }
  close() { this.sql.close(); }
}
