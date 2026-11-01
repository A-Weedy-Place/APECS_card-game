import { spawn } from 'node:child_process';
try { process.loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const token = process.env.ADMIN_TOKEN;
if (!token || token.length < 16 || ['polar-local', 'replace-with-a-long-random-token'].includes(token)) {
  console.error('LAN mode requires a private ADMIN_TOKEN of at least 16 characters. Set it in the process environment or .env.local.');
  process.exit(1);
}
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '0.0.0.0', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
server.on('exit', code => process.exit(code ?? 0));
server.on('error', error => { console.error(error.message); process.exit(1); });
