import assert from 'node:assert/strict';
import {lstat,readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {assertFreePort} from './families/runtime-preflight.mjs';
export async function leaseAbsent(path){try{await lstat(path);return false;}catch(error){if(error.code==='ENOENT')return true;throw error;}}
/** Observe only the PGID created by our detached spawn; zombies are reaped by the outer subreaper. */
export async function processGroupMembers(pgid){
 const members=[];for(const name of await readdir('/proc')){if(!/^\d+$/.test(name))continue;let stat;try{stat=await readFile(join('/proc',name,'stat'),'utf8');}catch(error){if(['ENOENT','ESRCH'].includes(error.code))continue;throw error;}const fields=stat.slice(stat.lastIndexOf(')')+2).trim().split(/\s+/);if(Number(fields[2])===pgid)members.push({pid:Number(name),state:fields[0],ppid:Number(fields[1])});}return members.sort((a,b)=>a.pid-b.pid);
}
export function ownedServerShutdown({server,port,leasePath,timeoutMs=30000,pollMs=250,record=async()=>{},signal=(pid,name)=>process.kill(pid,name),checkPort=assertFreePort,checkLease=leaseAbsent,members=processGroupMembers,now=()=>performance.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 assert(Number.isInteger(server.pid)&&server.pid>1);assert(Number.isInteger(timeoutMs)&&timeoutMs>0);assert(Number.isInteger(pollMs)&&pollMs>0);assert(leasePath.startsWith('/'));const pgid=server.pid;let exit=server.exitCode!==null||server.signalCode!==null?{code:server.exitCode,signal:server.signalCode}:null;
 server.once('exit',(code,signal)=>{exit={code,signal};});let pending;
 return ()=>pending??=(async()=>{
  const start=now();await record({phase:'owned-shutdown-start',pid:server.pid,pgid,spawnargs:server.spawnargs,port,leasePath,timeoutMs});
  // No PID discovery, fallback signal or lock removal. Signal only our still-owned spawn group once.
  if(!exit){try{signal(-pgid,'SIGTERM');await record({phase:'owned-shutdown-signal',pgid,signal:'SIGTERM'});}catch(error){await record({phase:'owned-shutdown-signal-error',code:error.code,message:error.message});if(error.code!=='ESRCH')throw error;}}
  for(;;){let portFree=false;try{await checkPort(port);portFree=true;}catch(error){if(error.code!=='EADDRINUSE')throw error;}
   const absent=await checkLease(leasePath),group=await members(pgid),live=group.filter(p=>p.state!=='Z'&&p.state!=='X'),elapsedMs=Math.round(now()-start);
   const observation={phase:'owned-shutdown-observation',pgid,wrapperExit:exit,portFree,leaseAbsent:absent,liveMembers:live,zombieMembers:group.filter(p=>p.state==='Z'||p.state==='X'),elapsedMs};await record(observation);
   if(exit&&portFree&&absent&&live.length===0){await record({phase:'owned-shutdown-settled',pgid,wrapperExit:exit,elapsedMs});return observation;}
   if(elapsedMs>=timeoutMs){const error=Error('Owned server shutdown did not settle: wrapper exit, port, lease and live process group must all settle; no foreign process or lease was modified');error.shutdown=observation;throw error;}
   await sleep(Math.min(pollMs,timeoutMs-elapsedMs));
  }
 })();
}
