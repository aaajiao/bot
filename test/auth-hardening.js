'use strict';
const fs = require('fs');
const vm = require('vm');
const http = require('http');
const crypto = require('crypto');
const childProcess = require('child_process');
const pathModule = require('path');
const connect = require('connect');
const jwt = require('jsonwebtoken');
const sourceRoot = pathModule.resolve(__dirname, '..');
const fixtures = {
  original: fs.readFileSync(pathModule.join(__dirname, 'fixtures/legacy-auth.js')).toString('base64'),
  patched: fs.readFileSync(pathModule.join(sourceRoot, 'api/index.js')).toString('base64'),
  store: fs.readFileSync(pathModule.join(sourceRoot, 'api/token-revocations.js')).toString('base64')
};
const results = [];
const testRoot = fs.mkdtempSync('/tmp/bot-auth-revocation-qa-');
const storeModulePath = pathModule.join(testRoot,'token-revocations.js');
fs.writeFileSync(storeModulePath,Buffer.from(fixtures.store,'base64'),{mode:0o600});
const revocationModule = require(storeModulePath);
const stateDirectory = pathModule.join(testRoot,'api-state');
const stores = [];
const faults = {read:false,write:false};
const faultFileSystem = Object.assign(Object.create(fs),{
  readFileSync(){ if(faults.read){const e=new Error('injected');e.code='EIO';throw e;}return fs.readFileSync.apply(fs,arguments); },
  renameSync(){ if(faults.write){const e=new Error('injected');e.code='EIO';throw e;}return fs.renameSync.apply(fs,arguments); }
});
function removeTestTree(p){if(!fs.existsSync(p))return;for(const n of fs.readdirSync(p)){const f=pathModule.join(p,n);if(fs.lstatSync(f).isDirectory())removeTestTree(f);else fs.unlinkSync(f);}fs.rmdirSync(p);}
function cleanupTest(){stores.forEach(s=>s.close());removeTestTree(testRoot);}

const secret = crypto.randomBytes(48).toString('hex');
const testPassword = crypto.randomBytes(24).toString('hex');
process.env.JWT_SECRET = secret;
process.env.LOGIN_USER = 'isolated-qa-user';
process.env.LOGIN_PASS = testPassword;
process.env.MONGO_URL = 'mongodb://never-connected.invalid/isolated-test';
const hexId = '0123456789abcdef01234567';
function sha(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function record(name, pass, details) { results.push({name, pass:!!pass, details:details||{}}); }
function compile(source, label) {
  const stats = {controllerCalls:[], multipartCalls:0, stubbedDatabaseConnectCalls:0};
  const controller = name => (req,res) => {
    stats.controllerCalls.push(name);
    res.json({controller:name,authenticated:!!req.user,url:req.url,originalUrl:req.originalUrl});
  };
  const pCon = {};
  ['projectList','projectCreatePost','projectDetail','projectDeletePost','projectUpdatePost'].forEach(n=>pCon[n]=controller(n));
  const iCon = {};
  ['itemCreatePost','itemUpdatePost','itemDeletePost'].forEach(n=>iCon[n]=controller(n));
  const stubs = {
    './token-revocations':Object.assign({},revocationModule,{createStore(options){
      const store=revocationModule.createStore(Object.assign({},options,{directory:stateDirectory,requireMount:false,cleanupIntervalMs:0,onMaintenanceError(){},fileSystem:faultFileSystem}));stores.push(store);return store;
    }}),
    mongoose:{connect(){stats.stubbedDatabaseConnectCalls++;return Promise.resolve();},connection:{on(){return this;}}},
    './mongo/controllers/projectController':pCon,
    './mongo/controllers/itemController':iCon,
    dotenv:{config(){return {parsed:{}};}},
    'express-form-post':()=>({middleware:()=>((req,res,next)=>{stats.multipartCalls++;next();})})
  };
  const allowed = new Set(['express','body-parser','cookie-parser','path','express-jwt','jsonwebtoken','crypto']);
  function isolatedRequire(name) {
    if(Object.prototype.hasOwnProperty.call(stubs,name))return stubs[name];
    if(!allowed.has(name))throw new Error('Unexpected module in isolated source');
    return require(name);
  }
  const module = {exports:{}};
  const fn = vm.runInThisContext('(function(require,module,exports,__dirname,__filename){\n'+source+'\n})',{filename:'/isolated-qa/'+label+'.js'});
  fn(isolatedRequire,module,module.exports,'/isolated-qa/api','/isolated-qa/api/index.js');
  const outer = connect();
  outer.use(module.exports.path,module.exports.handler);
  outer.use((err,req,res,next)=>{res.statusCode=err.status||500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({status:res.statusCode,name:err.name}));});
  return {server:http.createServer(outer),stats};
}
function listen(server){return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));}
function close(server){return new Promise(resolve=>server.close(resolve));}
function request(port,path,method,body,token,multipart) {
  return new Promise((resolve,reject)=>{
    const payload=multipart?'--qa\r\nContent-Disposition: form-data; name="file"; filename="qa.txt"\r\nContent-Type: text/plain\r\n\r\nfixture\r\n--qa--\r\n':body===undefined?'':JSON.stringify(body);
    const headers={};
    if(body!==undefined||multipart){headers['Content-Type']=multipart?'multipart/form-data; boundary=qa':'application/json';headers['Content-Length']=Buffer.byteLength(payload);}
    if(token)headers.Authorization='Bearer '+token;
    const req=http.request({hostname:'127.0.0.1',port,path,method:method||'POST',headers,agent:false},res=>{
      let text='';res.on('data',c=>text+=c);res.on('end',()=>{let data;try{data=JSON.parse(text);}catch(e){data={};}resolve({status:res.statusCode,data});});
    });
    req.on('error',reject);req.end(payload);
  });
}
(async()=>{
  const original=Buffer.from(fixtures.original,'base64').toString();
  const patched=Buffer.from(fixtures.patched,'base64').toString();
  record('current repository source loaded', Buffer.from(fixtures.patched,'base64').equals(fs.readFileSync(pathModule.join(sourceRoot,'api/index.js'))));
  const old=compile(original,'original');let port=await listen(old.server);
  try {
    for(const pair of [['/api/project/create','projectCreatePost'],['/api/project/delete/'+hexId,'projectDeletePost'],['/api/project/update/'+hexId,'projectUpdatePost']]){
      const r=await request(port,pair[0],'POST',{});
      record('original defect reproduced using stub: '+pair[1],r.status===200&&r.data.controller===pair[1]&&!r.data.authenticated,{status:r.status,controllerReached:r.data.controller});
    }
  } finally { await close(old.server); }
  const fresh=compile(patched,'patched');port=await listen(fresh.server);
  try {
    const paths=['/api/project/create','/api/project/delete/'+hexId,'/api/project/update/'+hexId,'/api/project/','/api/item/create','/api/item/update/'+hexId,'/api/item/delete/'+hexId];
    for(const p of paths){const count=fresh.stats.controllerCalls.length;const r=await request(port,p,'POST',{});record('anonymous blocked: '+p,r.status===401&&r.data.status===401&&fresh.stats.controllerCalls.length===count,{status:r.status,controllerNotReached:fresh.stats.controllerCalls.length===count});}
    let count=fresh.stats.multipartCalls;
    let r=await request(port,'/api/item/create','POST',undefined,null,true);
    record('anonymous multipart upload rejected before parser',r.status===401&&fresh.stats.multipartCalls===count,{status:r.status,parserNotReached:fresh.stats.multipartCalls===count});
    r=await request(port,'/api/project/'+hexId+'?qa=mount','POST',{});
    record('public player remains readable at Nuxt /api mount',r.status===200&&r.data.controller==='projectDetail'&&!r.data.authenticated&&r.data.url==='/project/'+hexId+'?qa=mount'&&r.data.originalUrl==='/api/project/'+hexId+'?qa=mount',{status:r.status,mountedUrl:r.data.url,originalUrl:r.data.originalUrl});
    r=await request(port,'/api/project/'+hexId.toUpperCase()+'/','POST',{});
    record('public valid uppercase ObjectId and trailing slash retained',r.status===200&&r.data.controller==='projectDetail',{status:r.status});
    for(const p of ['/api/project/'+hexId+'/extra','/api/project/'+hexId+'f','/api/auth/login/extra']){r=await request(port,p,'POST',{});record('nonexact exemption rejected: '+p,r.status===401,{status:r.status});}
    r=await request(port,'/api/project/'+hexId,'GET');record('public exception is POST only',r.status===401,{status:r.status});
    r=await request(port,'/api/auth/login','POST',{username:'isolated-qa-user',password:'wrong'});record('bad login remains401',r.status===401,{status:r.status});
    r=await request(port,'/api/auth/login','POST',{username:'isolated-qa-user',password:testPassword});
    const token=r.data.token;const claims=typeof token==='string'?jwt.verify(token,secret):{};
    record('login protocol retained with24hour token',r.status===200&&typeof token==='string'&&Object.keys(r.data).join(',')==='token'&&claims.exp-claims.iat===86400&&/^[a-f0-9]{64}$/.test(claims.jti),{status:r.status,tokenReturned:typeof token==='string',expiresInSeconds:claims.exp-claims.iat});
    r=await request(port,'/api/auth/login/','POST',{username:'isolated-qa-user',password:testPassword});record('trailing slash login remains available',r.status===200&&typeof r.data.token==='string',{status:r.status});
    for(const p of paths){r=await request(port,p,'POST',{},token);record('valid token reaches authorized handler: '+p,r.status===200&&r.data.authenticated===true,{status:r.status,handlerReached:r.data.controller});}
    count=fresh.stats.multipartCalls;r=await request(port,'/api/item/create','POST',undefined,token,true);record('valid token reaches upload parser and handler',r.status===200&&r.data.authenticated&&fresh.stats.multipartCalls===count+1,{status:r.status});
    r=await request(port,'/api/auth/user','GET',undefined,token);record('valid token user response preserved',r.status===200&&!!r.data.user,{status:r.status});
    for(const pair of [['missing',null],['invalid','not-a-token'],['expired',jwt.sign({username:'isolated-qa-user'},secret,{expiresIn:-1})]]){r=await request(port,'/api/auth/user','GET',undefined,pair[1]);record(pair[0]+' token returns401 JSON',r.status===401&&r.data.status===401&&r.data.name==='UnauthorizedError',{status:r.status});}
    const legacy=jwt.sign({username:'isolated-qa-user'},secret);r=await request(port,'/api/auth/user','GET',undefined,legacy);record('legacy no-exp token rejected',r.status===401,{status:r.status});
    const stateFile=pathModule.join(stateDirectory,'token-revocations.json');
    const digest=crypto.createHash('sha256').update(token).digest('hex');
    r=await request(port,'/api/auth/logout','POST',{},token);
    record('logout persists revocation before success',r.status===200&&r.data.status==='OK',{status:r.status});
    const stored=JSON.parse(fs.readFileSync(stateFile,'utf8'));
    const serialized=fs.readFileSync(stateFile,'utf8');
    record('persistent file is0600 and contains only digest plus exp',
      (fs.statSync(stateFile).mode&0o777)===0o600&&stored.entries.some(e=>e.digest===digest&&e.exp===claims.exp)&&
      stored.entries.every(e=>Object.keys(e).sort().join(',')==='digest,exp')&&!serialized.includes(token)&&!serialized.includes(claims.jti)&&!serialized.includes('isolated-qa-user'),
      {mode0600:(fs.statSync(stateFile).mode&0o777)===0o600,records:stored.entries.length,noRawCredentials:true});
    r=await request(port,'/api/auth/user','GET',undefined,token);record('logged out token rejected',r.status===401,{status:r.status});
    const originalNow=Date.now;const frozen=originalNow();let loginOne,loginTwo;
    try{Date.now=()=>frozen;loginOne=await request(port,'/api/auth/login','POST',{username:'isolated-qa-user',password:testPassword});loginTwo=await request(port,'/api/auth/login','POST',{username:'isolated-qa-user',password:testPassword});}finally{Date.now=originalNow;}
    const tokenOne=loginOne.data.token;const tokenTwo=loginTwo.data.token;const one=jwt.verify(tokenOne,secret);const two=jwt.verify(tokenTwo,secret);
    record('same-second logins have unique random jti and token',one.iat===two.iat&&one.jti!==two.jti&&tokenOne!==tokenTwo&&one.exp-one.iat===86400,{sameIat:one.iat===two.iat,distinctJti:one.jti!==two.jti,distinctToken:tokenOne!==tokenTwo});
    await request(port,'/api/auth/logout','POST',{},tokenOne);r=await request(port,'/api/auth/user','GET',undefined,tokenTwo);
    record('new same-second login remains valid after old token logout',r.status===200,{status:r.status});
    const childRead=childProcess.spawnSync(process.execPath,['--max-old-space-size=32','-e',"const s=require(process.argv[1]).createStore({directory:process.argv[2],cleanupIntervalMs:0});process.stdout.write(JSON.stringify({revoked:s.isRevoked(process.argv[3])}));s.close();",storeModulePath,stateDirectory,digest],{encoding:'utf8',timeout:10000});
    let childReadResult={};try{childReadResult=JSON.parse(childRead.stdout);}catch(e){}
    record('fresh independent process sees durable revocation',childRead.status===0&&childReadResult.revoked===true,{childExit:childRead.status,revoked:childReadResult.revoked});
    const beforeFailure=fs.readFileSync(stateFile,'utf8');faults.write=true;
    r=await request(port,'/api/auth/logout','POST',{},tokenTwo);
    record('logout persistence failure returns generic503 not success',r.status===503&&r.data.name==='AuthStateUnavailable'&&r.data.status===503&&!JSON.stringify(r.data).includes(testRoot),{status:r.status,genericError:r.data.name});
    r=await request(port,'/api/auth/user','GET',undefined,tokenTwo);record('valid reads continue during write-only storage failure',r.status===200,{status:r.status});
    r=await request(port,'/api/auth/login','POST',{username:'isolated-qa-user',password:testPassword});record('login remains available when durable state is readable',r.status===200&&!!r.data.token,{status:r.status});
    faults.write=false;
    record('failed persistence did not acknowledge or silently retain memory-only revocation',fs.readFileSync(stateFile,'utf8')===beforeFailure,{durableFileUnchanged:fs.readFileSync(stateFile,'utf8')===beforeFailure});
    faults.read=true;r=await request(port,'/api/auth/user','GET',undefined,tokenTwo);record('unreadable state fails protected request closed with generic503',r.status===503&&r.data.name==='AuthStateUnavailable',{status:r.status});
    r=await request(port,'/api/project/'+hexId,'POST',{});record('public player remains available during auth-state failure',r.status===200&&r.data.controller==='projectDetail',{status:r.status});
    r=await request(port,'/api/auth/login','POST',{username:'isolated-qa-user',password:testPassword});record('login does not issue unusable token when state unreadable',r.status===503&&!r.data.token,{status:r.status});faults.read=false;
    r=await request(port,'/api/auth/user','GET',undefined,tokenTwo);record('valid auth recovers after state read failure',r.status===200,{status:r.status});
    let fakeNow=1000;const expirationDir=pathModule.join(testRoot,'expiration');
    const expirationStore=revocationModule.createStore({directory:expirationDir,cleanupIntervalMs:0,now:()=>fakeNow,maximumEntries:2});stores.push(expirationStore);
    const d1=sha('expiration-one'),d2=sha('expiration-two'),d3=sha('expiration-three');
    expirationStore.revoke(d1,1010);expirationStore.revoke(d2,1020);let fullRejected=false;
    try{expirationStore.revoke(d3,1030);}catch(e){fullRejected=e.code==='AUTH_STATE_UNAVAILABLE';}
    record('capacity limit never evicts live revocations',fullRejected&&expirationStore.isRevoked(d1)&&expirationStore.isRevoked(d2)&&!expirationStore.isRevoked(d3),{capacity:2,rejected:fullRejected});
    fakeNow=1011;expirationStore.cleanupExpired();let expirationState=JSON.parse(fs.readFileSync(pathModule.join(expirationDir,'token-revocations.json'),'utf8'));
    record('expired entries removed while unexpired revocation retained',expirationState.entries.length===1&&!expirationStore.isRevoked(d1)&&expirationStore.isRevoked(d2),{remainingEntries:expirationState.entries.length});
    expirationStore.revoke(d3,1030);record('capacity reclaimed after expiration',expirationStore.isRevoked(d2)&&expirationStore.isRevoked(d3),{remainingEntries:2});
    const byteDir=pathModule.join(testRoot,'byte-cap');const byteStore=revocationModule.createStore({directory:byteDir,cleanupIntervalMs:0,maximumBytes:200});stores.push(byteStore);const future=Math.floor(Date.now()/1000)+600;
    byteStore.revoke(d1,future);let bytesRejected=false;try{byteStore.revoke(d2,future);}catch(e){bytesRejected=e.code==='AUTH_STATE_UNAVAILABLE';}
    record('serialized file byte limit enforced without losing prior entries',bytesRejected&&fs.statSync(pathModule.join(byteDir,'token-revocations.json')).size<=200&&byteStore.isRevoked(d1)&&!byteStore.isRevoked(d2),{limitBytes:200,rejected:bytesRejected});
    const corruptDir=pathModule.join(testRoot,'corrupt');const corruptStore=revocationModule.createStore({directory:corruptDir,cleanupIntervalMs:0});stores.push(corruptStore);fs.writeFileSync(pathModule.join(corruptDir,'token-revocations.json'),'{invalid',{mode:0o600});let corruptRejected=false;try{corruptStore.isRevoked(d1);}catch(e){corruptRejected=e.code==='AUTH_STATE_UNAVAILABLE';}
    record('corrupt revocation state fails closed without resetting file',corruptRejected&&fs.readFileSync(pathModule.join(corruptDir,'token-revocations.json'),'utf8')==='{invalid',{rejected:corruptRejected});
    const unmountedDir=pathModule.join(testRoot,'not-mounted');const unmounted=revocationModule.createStore({directory:unmountedDir,cleanupIntervalMs:0,requireMount:true});stores.push(unmounted);let mountRejected=false;try{unmounted.assertReadable();}catch(e){mountRejected=e.code==='AUTH_STATE_UNAVAILABLE';}
    record('production mount guard rejects ephemeral directory fallback',mountRejected&&!fs.existsSync(pathModule.join(unmountedDir,'token-revocations.json')),{rejected:mountRejected});
    const lockFile=pathModule.join(stateDirectory,'token-revocations.lock');let held=fs.openSync(lockFile,fs.constants.O_RDWR);
    const acquired=childProcess.spawnSync('/usr/bin/flock',['-x','3'],{stdio:['ignore','ignore','pipe',held],timeout:1500});
    const contended=childProcess.spawnSync('/usr/bin/flock',['-n',lockFile,'/bin/true']);fs.closeSync(held);held=undefined;
    const released=childProcess.spawnSync('/usr/bin/flock',['-n',lockFile,'/bin/true']);
    record('kernel lock remains held by parent and releases on close',acquired.status===0&&contended.status===1&&released.status===0,{acquired:acquired.status,contender:contended.status,afterClose:released.status});
    const parallelDir=pathModule.join(testRoot,'parallel');const parallel=revocationModule.createStore({directory:parallelDir,cleanupIntervalMs:0});stores.push(parallel);
    const childCode="const c=require('crypto');const s=require(process.argv[1]).createStore({directory:process.argv[2],cleanupIntervalMs:0});for(let i=0;i<5;i++)s.revoke(c.createHash('sha256').update('child-'+i).digest('hex'),Number(process.argv[3]));s.close();";
    const child=childProcess.spawn(process.execPath,['--max-old-space-size=32','-e',childCode,storeModulePath,parallelDir,String(future)],{stdio:['ignore','ignore','ignore']});
    const childDone=new Promise((resolve,reject)=>{child.on('exit',resolve);child.on('error',reject);});
    for(let i=0;i<5;i++)parallel.revoke(sha('parent-'+i),future);
    const childExit=await childDone;const parallelEntries=JSON.parse(fs.readFileSync(pathModule.join(parallelDir,'token-revocations.json'),'utf8')).entries;
    record('independent concurrent writers preserve all revocations',childExit===0&&parallelEntries.length===10,{childExit,entries:parallelEntries.length});

    record('database connections are stubbed only',old.stats.stubbedDatabaseConnectCalls===1&&fresh.stats.stubbedDatabaseConnectCalls===1,{realDatabaseOrSmtpCalls:0});
  } finally { await close(fresh.server); }
  cleanupTest();
  process.stdout.write(JSON.stringify({checkedUtc:new Date().toISOString(),node:process.version,isolated:true,scope:'Installed project dependencies; original Nuxt connect-style /api mount. Source compiled with database/controllers/multipart/dotenv stubs; synthetic in-memory credentials only. HTTP requests only to temporary localhost ephemeral port; production application was never requested.',pass:results.every(x=>x.pass),checks:results.length,results},null,2)+'\n');
  if(results.some(x=>!x.pass))process.exitCode=1;
})().catch(e=>{try{cleanupTest();}catch(cleanupError){}process.stdout.write(JSON.stringify({pass:false,errorName:e.name,errorCode:e.code,partialResults:results,errorFrames:String(e.stack||'').split('\n').filter(line=>/^\s+at /.test(line)).slice(0,8),detailsOmitted:true})+'\n');process.exitCode=1;});
