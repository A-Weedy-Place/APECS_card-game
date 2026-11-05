import { bearer, failure, jsonBody, respond } from "@/server/http";
import { getRun, modelSettings, modelStatus, rateLimit } from "@/server/persistence";
import { requestModel } from "@/server/model-jobs";
export const runtime="nodejs";
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{const{id}=await context.params,token=bearer(request),settings=await modelSettings(id,token),run=await getRun(id,token);return respond(run.modelEvaluation??await modelStatus(settings));}catch(error){return failure(error);}}
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{const{id}=await context.params;await jsonBody(request);await rateLimit(`model:${id}`,4);return respond(await requestModel(id,bearer(request)),202);}catch(error){return failure(error);}}
