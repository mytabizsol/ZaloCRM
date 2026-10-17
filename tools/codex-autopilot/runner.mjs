// MYTA CRM Codex Autopilot: bounded task-by-task supervisor (no production migrations).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
const ROOT = 'D:\\Apps\\ZaloCRM';
const HOME = 'D:\\Apps\\ZaloCRM-autopilot';
const codexJs = path.join(process.env.APPDATA || path.join(os.homedir(),'AppData','Roaming'),
  'npm','node_modules','@openai','codex','bin','codex.js');
const TASKS = path.join(ROOT,'docs','codex','TASKS.md');
const PROGRESS = path.join(ROOT,'docs','codex','PROGRESS.md');
const CFG = path.join(ROOT,'tools','codex-autopilot','config.json');
const STATE = path.join(HOME,'state.json');
const STOP = path.join(HOME,'STOP');
const PID = path.join(HOME,'runner.pid');
const LOG = path.join(HOME,'autopilot.log');
const BRANCH = 'feature/upstream-v34-integration';
fs.mkdirSync(HOME,{recursive:true});
const cfg=JSON.parse(fs.readFileSync(CFG,'utf8'));
const sleep=n=>new Promise(r=>setTimeout(r,n));
function now(){return new Date().toISOString();}
function log(s){const line='['+now()+'] '+s;fs.appendFileSync(LOG,line+'\n');console.log(line);}
function state(){try{return JSON.parse(fs.readFileSync(STATE,'utf8'));}catch{return {date:'',attempts:0,status:'idle'};}}
function save(s){fs.writeFileSync(STATE,JSON.stringify({...s,updatedAt:now()},null,2));}
function run(exe,args,options={}){
 const r=spawnSync(exe,args,{cwd:ROOT,encoding:'utf8',windowsHide:true,
   timeout:options.timeout||120000,maxBuffer:1024*1024,env:{...process.env,GIT_TERMINAL_PROMPT:'0',CI:'true'}});
 return {ok:r.status===0,stdout:String(r.stdout||''),stderr:String(r.stderr||''),status:r.status,error:r.error?.message||''};
}
function check(ok,msg){if(!ok)throw Error(msg);}
function tasks(){return fs.readFileSync(TASKS,'utf8').split(/\r?\n/).flatMap(l=>{
 const p=l.split('|').map(x=>x.trim());
 return p.length>=7&&/^STEP-\d\d$/.test(p[1])?[{id:p[1],status:p[2],title:p[3],acceptance:p[4],deps:p[5]}]:[];
});}
function updateTask(id,status){
 const s=fs.readFileSync(TASKS,'utf8'),re=new RegExp('(^\\| '+id+' \\| )(?:TODO|DONE|PARTIAL|BLOCKED)( \\|)','m');
 check(re.test(s),'Task line not found: '+id);
 fs.writeFileSync(TASKS,s.replace(re,'$1'+status+'$2'));
}
function choose(){
 const items=tasks(),done=new Set(items.filter(t=>t.status==='DONE').map(t=>t.id));
 for(const t of items){
  if(t.status!=='TODO')continue;
  if(!(t.deps.match(/STEP-\d\d/g)||[]).every(x=>done.has(x)))continue;
  if(t.id==='STEP-05'&&!fs.existsSync(path.join(HOME,'meta-api-ready.flag')))continue;
  if(t.id==='STEP-17'&&items.some(x=>x.status!=='DONE'&&x.id!=='STEP-17'))continue;
  return t;
 }
 return null;
}
function clean(){
 const br=run('git',['branch','--show-current']);
 check(br.ok&&br.stdout.trim()===BRANCH,'Wrong branch '+br.stdout);
 const st=run('git',['status','--porcelain']);
 check(st.ok&&!st.stdout.trim(),'Uncommitted changes. Stop before overwriting:\n'+st.stdout.slice(0,1200));
}
function progress(id,arr){fs.appendFileSync(PROGRESS,'\n### Autopilot '+id+' — '+now()+'\n'+arr.map(s=>'- '+s).join('\n')+'\n');}
function proc(exe,args,{minutes=30,file,input=''}={}){
 return new Promise(resolve=>{
  let recent='',bytes=0,timeout=false;
  const stream=fs.createWriteStream(file,{flags:'a'});
  const child=spawn(exe,args,{cwd:ROOT,windowsHide:true,stdio:['pipe','pipe','pipe'],
   env:{...process.env,GIT_TERMINAL_PROMPT:'0',CI:'true',FORCE_COLOR:'0'}});
  const capture=b=>{const t=b.toString('utf8');bytes+=Buffer.byteLength(t);stream.write(t);recent=(recent+t).slice(-13000);};
  child.stdout?.on('data',capture);child.stderr?.on('data',capture);
  child.stdin?.on('error',()=>{});child.stdin?.end(input);
  const timer=setTimeout(()=>{timeout=true;log('Subprocess timeout PID '+child.pid);
   run('taskkill',['/PID',String(child.pid),'/T','/F'],{timeout:30000});
  },minutes*60000);
  child.on('error',e=>capture('Process error '+e.message));
  child.on('close',code=>{clearTimeout(timer);stream.end();resolve({ok:code===0&&!timeout,code,timeout,recent,bytes});});
 });
}
async function backup(id){
 if(!cfg.backupBeforeSchemaSteps.includes(id))return;
 const fname='backup-'+id+'-'+now().replace(/[:.]/g,'-')+'.dump', dest=path.join(HOME,fname);
 const target=fs.createWriteStream(dest,{flags:'wx'});
 const cp=spawn('docker',['exec','zalo-crm-db','sh','-lc',
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc'],{cwd:ROOT,windowsHide:true});
 cp.stdout.pipe(target);
 let err='';cp.stderr.on('data',x=>{err+=x.toString().slice(0,1000);});
 const result=await new Promise((resolve,reject)=>{cp.on('error',reject);cp.on('close',resolve);});
 await new Promise(resolve=>target.end(resolve));
 const size=fs.statSync(dest).size;
 check(result===0&&size>=1000,'Backup failed: '+err+' size '+size);
 log('DB backup verified '+fname+' '+size+' bytes');
}
async function codex(task,repairErrors=''){
 const id=task.id,mode=repairErrors?'repair':'implementation';
 const file=path.join(HOME,id+'-'+mode+'-'+Date.now()+'.log');
 const summary=path.join(HOME,id+'-'+mode+'-summary.txt');
 const body=repairErrors?
   'External Docker build failed. Fix ONLY these errors:\n'+repairErrors.slice(-4500):
   'Implement '+id+' only. Feature: '+task.title+'\nAcceptance: '+task.acceptance+'\nDependencies: '+task.deps;
 const prompt=[
  'You are a coding worker in D:\\Apps\\ZaloCRM. Read root AGENTS.md, the current task in docs/codex/TASKS.md, relevant project spec and no more than two relevant skills.',
  'Owner authorized unattended task-by-task MYTA CRM development; EXTERNAL SUPERVISOR invokes a new Codex worker for each step. YOU must finish only '+id+' and stop.',
  body,
  'Do not run git add/commit/push, Docker Buildx, Windows admin commands, migrations on live DB, remote provider API live publishes, or modify runner tools/codex-autopilot, .codex, secrets and docs/codex/TASKS.md.',
  'External supervisor handles build, commit, feature-branch push and subsequent invocation. On schema changes write additive Prisma migration SQL and tests, never run db push or migrate deploy. Do not alter Odoo.',
  'Learn from relevant public GitHub OSS when useful; implement original compatible code, respect licenses, do not install complete new SaaS products.',
  'Use actual MYTA logo/branding, coherent responsive Vuetify UX, tenant checks and RBAC. Preserve existing features.',
  'Do not claim unverified provider connection. Avoid consuming tokens by dumping huge files, terminal help or repeated failed tool calls.',
  'Output focused summary of changes/tests/gaps when finished. Do not start another step.'
 ].join('\n\n');
 log('Starting '+id+' '+mode+' via '+cfg.model+'/'+cfg.reasoning);
 const r=await proc(process.execPath,[codexJs,'exec','-C',ROOT,'-m',cfg.model,
  '-c','model_reasoning_effort="'+cfg.reasoning+'"','-s','workspace-write',
  '-o',summary,'-'],{minutes:cfg.stepMaxMinutes,file,input:prompt});
 log(id+' '+mode+' exit='+r.code+' timeout='+r.timeout+' bytes='+r.bytes+' log='+file);
 return r;
}
function validate(task){
 const st=run('git',['status','--porcelain']);
 check(st.ok&&st.stdout.trim(),'No source changes after '+task.id);
 const forbidden=st.stdout.split(/\r?\n/).map(x=>x.slice(3)).filter(x=>/^(\.env|tools[\\/]codex-autopilot[\\/]|\.codex[\\/]|backend[\\/]\.env|frontend[\\/]\.env)/i.test(x));
 check(!forbidden.length,'Forbidden changed files: '+forbidden.join(','));
 if(/backend[\\/]prisma[\\/]schema\.prisma/i.test(st.stdout)){
  check(/backend[\\/]prisma[\\/]migrations[\\/]/i.test(st.stdout),'Schema changed without additive migration file.');
 }
 const diff=run('git',['diff','--check']);
 check(diff.ok,'Whitespace diff failed: '+diff.stdout.slice(0,700));
}
async function build(){
 const file=path.join(HOME,'build-'+Date.now()+'.log');
 log('External supervised Docker build (NO deployment or database migration)');
 const r=await proc('docker',['compose','build','app'],{minutes:cfg.buildMaxMinutes,file});
 log('Build exit '+r.code+' log='+file);
 return r;
}
function publish(t){
 progress(t.id,[
  'Codex source implemented; supervised docker compose build app succeeded; no automatic database migration or deployment.',
  'Build is NOT end-to-end business QA. Browser integration, provider OAuth and final production readiness remain in STEP-17 or provider gates.',
  'Changes committed to feature branch by external supervisor, not by Codex sandbox.'
 ]);
 updateTask(t.id,'DONE');
 const add=run('git',['add','-A','--','backend','frontend','docs/codex','MYTA-FCHAT-BUSINESS-FEATURE-MATRIX.md']);
 check(add.ok,'Git stage failed '+add.stderr);
 const names=run('git',['diff','--cached','--name-only']);
 check(names.ok&&names.stdout.trim(),'No staged source changes');
 const commit=run('git',['commit','-m','feat(myta-crm): implement '+t.id+' via supervised Codex']);
 check(commit.ok,'Git commit failed '+commit.stderr);
 const hash=run('git',['rev-parse','--short','HEAD']).stdout.trim();
 log('Committed '+t.id+' '+hash);
 const push=run('git',['push','origin',BRANCH],{timeout:120000});
 check(push.ok,'Push failed '+push.stderr);
 save({...state(),status:'completed',step:t.id,commit:hash});
 log('Pushed '+t.id+' '+hash);
}
async function work(t){
 let s=state();s.attempts++;s.status='running';s.step=t.id;save(s);
 clean();await backup(t.id);
 let r=await codex(t);
 check(r.ok,'Codex failed: '+r.recent.slice(-1300));
 validate(t);
 let b=await build();
 if(!b.ok){
  s=state();
  check(s.attempts<cfg.maxCodexRunsPerDay,'Build failed, daily budget exhausted: '+b.recent.slice(-2000));
  s.attempts++;save(s);
  log('Allowing one focused repair attempt');
  r=await codex(t,b.recent);
  check(r.ok,'Codex repair failed: '+r.recent.slice(-1400));
  validate(t);b=await build();
  check(b.ok,'Build failed after repair: '+b.recent.slice(-2200));
 }
 publish(t);
}
async function main(){
 if(process.argv.includes('--dry-run')){
  console.log(JSON.stringify({next:choose(),settings:cfg,current:state(),codexInstalled:fs.existsSync(codexJs)},null,2));
  return;
 }
 if(fs.existsSync(PID)){
  const old=Number(fs.readFileSync(PID,'utf8'));
  try{process.kill(old,0);throw Error('Already running PID '+old);}
  catch(e){if(String(e.message).startsWith('Already running'))throw e;}
 }
 fs.writeFileSync(PID,String(process.pid));
 process.on('exit',()=>{try{fs.unlinkSync(PID);}catch{}});
 check(fs.existsSync(codexJs),'Codex CLI JS not installed');
 log('MYTA CRM Autopilot started PID '+process.pid);
 while(true){
  if(fs.existsSync(STOP)){log('Operator STOP flag; exiting');save({...state(),status:'stopped'});break;}
  const day=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
  let s=state();
  if(s.date!==day){s={date:day,attempts:0,status:'idle'};save(s);}
  if(s.attempts>=cfg.maxCodexRunsPerDay){save({...s,status:'daily-budget-paused'});await sleep(60000);continue;}
  const t=choose();
  if(!t){log('No eligible tasks; approvals or dependencies pending');save({...s,status:'waiting-for-dependency'});break;}
  try{await work(t);}catch(e){
   log('SAFETY STOP '+String(e.stack||e).slice(0,2200));
   save({...state(),status:'blocked',error:String(e.message||e).slice(0,1200)});
   break;
  }
  await sleep(cfg.cooldownSeconds*1000);
 }
}
main().catch(e=>{log('FATAL '+String(e.stack||e).slice(0,2500));save({...state(),status:'fatal'});process.exitCode=1;});
