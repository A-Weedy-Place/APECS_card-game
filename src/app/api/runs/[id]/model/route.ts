import { bearer, failure, jsonBody, limit, respond } from "@/server/http";
import { modelSettings, modelStatus } from "@/server/store";
import { requestModel } from "@/server/model-jobs";
export const runtime="nodejs";
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{return respond(modelStatus(modelSettings((await context.params).id,bearer(request))));}catch(error){return failure(error);}}
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{const{id}=await context.params;await jsonBody(request);limit(`model:${id}`,4);return respond(requestModel(id,bearer(request)),202);}catch(error){return failure(error);}}
