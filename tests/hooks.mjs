import { existsSync, statSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
const SRC=fileURLToPath(new URL('../src', import.meta.url));
function tryFile(p){ for(const c of [p,p+'.ts',p+'/index.ts']){ if(existsSync(c)&&statSync(c).isFile()) return pathToFileURL(c).href; } return null; }
export async function resolve(spec, ctx, next){
  if(spec==='expo-router') return {url:new URL('./expo-router-stub.mjs', import.meta.url).href, shortCircuit:true};
  // httpApi/auth en Node (prueba del modo híbrido): Platform web = tokens solo en memoria.
  if(spec==='react-native'||spec==='expo-secure-store'||spec==='expo-linking') return {url:new URL('./expo-native-stub.mjs', import.meta.url).href, shortCircuit:true};
  let p=null;
  if(spec.startsWith('@/')) p=tryFile(SRC+'/'+spec.slice(2));
  else if(spec.startsWith('.') && ctx.parentURL?.startsWith(pathToFileURL(SRC).href.replace(/src$/, ''))) p=tryFile(fileURLToPath(new URL(spec,ctx.parentURL)));
  if(p) return {url:p, shortCircuit:true};
  return next(spec,ctx);
}
