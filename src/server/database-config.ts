export function journalModeFor(version: string): "WAL" | "DELETE" {
  const [major, minor, patch] = version.split(".").map(Number);
  // SQLite's WAL-reset race was fixed in 3.51.3, with backports to
  // 3.50.7 and 3.44.6. Use rollback journaling on older bundled runtimes.
  const patched = major > 3 || (major === 3 && (minor > 51 || (minor === 51 && patch >= 3) || (minor === 50 && patch >= 7) || (minor === 44 && patch >= 6)));
  return patched ? "WAL" : "DELETE";
}
