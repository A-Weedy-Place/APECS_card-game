import { bearer, failure, jsonBody, respond } from "@/server/http";
import { modelSettings, modelStatus, rateLimit } from "@/server/persistence";
import { requestModel } from "@/server/model-jobs";
export const runtime="nodejs";
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{return respond(await modelStatus(await modelSettings((await context.params).id,bearer(request))));}catch(error){return failure(error);}}
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{const{id}=await context.params;await jsonBody(request);await rateLimit(`model:${id}`,4);return respond(await requestModel(id,bearer(request)),202);}catch(error){return failure(error);}}
