import { afterEach, expect, it, vi } from "vitest";
import { rpc, AuthenticationExpired } from "../transport";
afterEach(()=>vi.unstubAllGlobals());
it("preserves typed conflicts for explicit local/server review",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({error:{code:"revision-conflict",message:"changed"}},{status:409})));
 await expect(rpc("execute",{})).rejects.toMatchObject({code:"revision-conflict"});
});
it("treats unknown 503 outcomes as recoverable rather than rejected commands",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({error:{code:"unavailable",message:"outcome uncertain"}},{status:503})));
 await expect(rpc("execute",{})).rejects.toMatchObject({message:"outcome uncertain"});
});
it("identifies expired authentication without discarding local recovery",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("login",{status:401})));
 await expect(rpc("readState")).rejects.toBeInstanceOf(AuthenticationExpired);
});
