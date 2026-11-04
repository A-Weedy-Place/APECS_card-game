import { spawn } from 'node:child_process';
try { process.loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const token = process.env.ADMIN_TOKEN;
const hashed = /^[a-f0-9]{32}:[a-f0-9]{64}$/.test(process.env.ADMIN_PASSWORD_HASH ?? '') && (process.env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32;
const legacy = token && token.length >= 16 && !['polar-local', 'replace-with-a-long-random-token'].includes(token);
if (!hashed && !legacy) {
  console.error('LAN mode requires ADMIN_PASSWORD_HASH with ADMIN_SESSION_SECRET, or a private ADMIN_TOKEN of at least 16 characters. Set them in .env.local.');
  process.exit(1);
}
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '0.0.0.0', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
server.on('exit', code => process.exit(code ?? 0));
server.on('error', error => { console.error(error.message); process.exit(1); });
