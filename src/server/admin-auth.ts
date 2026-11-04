import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { GameError } from "@/game/errors";
const legacyPassword=()=>process.env.ADMIN_TOKEN??(process.env.NODE_ENV==="development"?"polar-local":"");
function sessionSecret(){return process.env.ADMIN_SESSION_SECRET||legacyPassword();}
function equal(a:string,b:string){return Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function validAdminToken(token:string){
  if(token.length>512)return false;
  const legacy=legacyPassword();
  if(!process.env.ADMIN_PASSWORD_HASH&&legacy&&equal(token,legacy))return true;
  const secret=sessionSecret();if(!secret)return false;
  const [payload,signature,...rest]=token.split(".");
  if(!payload||!signature||rest.length||!equal(signature,createHmac("sha256",secret).update(payload).digest("base64url")))return false;
  try{const data=JSON.parse(Buffer.from(payload,"base64url").toString());return data.scope==="admin"&&Number.isInteger(data.expires)&&data.expires>Date.now()&&data.expires<=Date.now()+8*3600000;}catch{return false;}
}
export async function adminLogin(password:string){
  const secret=sessionSecret(),encoded=process.env.ADMIN_PASSWORD_HASH;
  if(!secret||!encoded&&!legacyPassword())throw new GameError("Admin access is not configured.",503);
  let valid=false;
  if(encoded){
    const [salt,digest,...rest]=encoded.split(":");
    if(!/^[a-f0-9]{32}$/.test(salt??"")||!/^[a-f0-9]{64}$/.test(digest??"")||rest.length)throw new GameError("Admin access is not configured.",503);
    const derived=await new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,32,(error,key)=>error?reject(error):resolve(key)));
    valid=timingSafeEqual(derived,Buffer.from(digest,"hex"));
  } else valid=equal(password,legacyPassword());
  if(!valid)throw new GameError("Incorrect password.",401);
  const payload=Buffer.from(JSON.stringify({scope:"admin",expires:Date.now()+8*3600000,nonce:randomBytes(16).toString("hex")})).toString("base64url");
  return `${payload}.${createHmac("sha256",secret).update(payload).digest("base64url")}`;
}
