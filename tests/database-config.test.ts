import test from "node:test";
import assert from "node:assert/strict";
import { journalModeFor } from "../src/server/database-config";
test("older SQLite versions use rollback journals rather than the known WAL race", () => {
  for (const version of ["3.50.4", "3.51.2", "3.44.5", "invalid"]) assert.equal(journalModeFor(version), "DELETE");
  for (const version of ["3.51.3", "3.52.0", "3.50.7", "3.44.6", "4.0.0"]) assert.equal(journalModeFor(version), "WAL");
});
