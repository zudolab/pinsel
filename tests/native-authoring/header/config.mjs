import assert from 'node:assert/strict';
import {realpath}from'node:fs/promises';
import{dirname,basename,join,relative,isAbsolute}from'node:path';
import{parseRuntimeArgs,repoRoot}from'../families/config.mjs';
export {repoRoot};
export function outside(root,target){const rel=relative(root,target);assert(isAbsolute(rel)||rel==='..'||rel.startsWith('../')||rel.startsWith('..\\'),'Header artifacts must be outside the checkout');}
export function parseHeaderArgs(args,cwd){const config=parseRuntimeArgs(args,cwd);outside(repoRoot,config.artifacts);return config;}
export async function assertHeaderArtifactLocation(target){outside(await realpath(repoRoot),join(await realpath(dirname(target)),basename(target)));}
