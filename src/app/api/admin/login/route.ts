import { adminLogin } from "@/server/admin-auth";
import { GameError } from "@/game/errors";
import { failure, jsonBody, respond } from "@/server/http";
import { rateLimit } from "@/server/persistence";
export const runtime="nodejs";
export async function POST(request:Request){
  try{
    const body=await jsonBody(request);
    if(typeof body.password!=="string"||!body.password.length||body.password.length>256)throw new GameError("Enter a password.");
    await rateLimit(`admin-login:${request.headers.get("x-forwarded-for")??"local"}`,10,600000);
    return respond({token:await adminLogin(body.password)});
  }catch(error){return failure(error);}
}
