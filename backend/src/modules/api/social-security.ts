import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'node:crypto';
import { config } from '../../config/index.js';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const derive=()=>scryptSync(config.encryptionKey,'myta-social-credentials-v1',32);
export function seal(secret:string):Uint8Array<ArrayBuffer> {
  const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',derive(),iv);
  const payload=Buffer.concat([c.update(secret,'utf8'),c.final()]);
  return new Uint8Array(Buffer.concat([iv,c.getAuthTag(),payload]));
}
export function unseal(buf:Uint8Array):string {
  const iv=buf.subarray(0,12),tag=buf.subarray(12,28);
  const d=createDecipheriv('aes-256-gcm',derive(),iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(buf.subarray(28)),d.final()]).toString('utf8');
}
const privateIp=(ip:string)=>{
  const x=ip.toLowerCase();
  if(x==='::1'||x==='::'||x.startsWith('fc')||x.startsWith('fd')||x.startsWith('fe80')||x.startsWith('::ffff:')){
    const mapped=x.replace('::ffff:','');
    if(mapped!==x)return privateIp(mapped);
    return true;
  }
  const p=x.split('.').map(Number);
  if(p.length===4)return p[0]===0||p[0]===10||p[0]===127||p[0]===169&&p[1]===254||
    p[0]===172&&p[1]>=16&&p[1]<=31||p[0]===192&&p[1]===168||
    p[0]===100&&p[1]>=64&&p[1]<=127||p[0]>=224||p[0]===192&&p[1]===0;
  return false;
};
/** Limits WordPress publishing to publicly routable HTTPS hosts, no redirects. */
export async function safePublicSite(input:string):Promise<string>{
  const u=new URL(input);
  if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||u.search||u.hash||
    isIP(u.hostname)||u.hostname==='localhost'||u.hostname.endsWith('.local')||!u.hostname.includes('.'))
    throw Error('Website phải là HTTPS domain công khai, không dùng địa chỉ nội bộ');
  const all=await lookup(u.hostname,{all:true,verbatim:true});
  if(!all.length||all.some(x=>privateIp(x.address)))throw Error('Website chỉ được trỏ đến IP công khai');
  return u.origin;
}
