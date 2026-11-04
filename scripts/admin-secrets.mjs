// Prints environment-file entries. Use a password on stdin; do not put it in shell history.
import {randomBytes,scryptSync} from 'node:crypto';
let password='';for await(const chunk of process.stdin)password+=chunk;
password=password.replace(/\r?\n$/,'');
if(!password||password.length>256)throw new Error('Supply a password on stdin.');
const salt=randomBytes(16).toString('hex');
console.log(`ADMIN_PASSWORD_HASH=${salt}:${scryptSync(password,salt,32).toString('hex')}`);
console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString('hex')}`);
