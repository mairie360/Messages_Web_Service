const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireSrc } = require('./support/load-ts.cjs');
const { proxyBffRequest } = requireSrc('lib/bff-proxy.ts');
const originalFetch=global.fetch;
const originalUrl=process.env.BFF_MESSAGE_BASE_URL;
afterEach(()=>{global.fetch=originalFetch;if(originalUrl===undefined)delete process.env.BFF_MESSAGE_BASE_URL;else process.env.BFF_MESSAGE_BASE_URL=originalUrl;});
const context={params:Promise.resolve({path:['stream']})};
const request=(headers={})=>new NextRequest('http://localhost/stream',{headers:{cookie:'accessToken=test-session',...headers}});
const identity=()=>Response.json({currentUser:{id:'alice'}});

test('stream handshake uses the session cookie, forwards its cursor and has no body deadline at 15s', async t=>{
  process.env.BFF_MESSAGE_BASE_URL='http://bff.example';
  const timers=[];t.mock.method(global,'setTimeout',(callback,delay)=>{const timer={callback,delay,cleared:false};timers.push(timer);return timer;});
  t.mock.method(global,'clearTimeout',timer=>{if(timer)timer.cleared=true;});
  let upstream,streamSignal,cancelled=false;const calls=[];
  global.fetch=async (url,init)=>{
    calls.push({url:String(url),headers:new Headers(init.headers)});
    if(new URL(url).pathname==='/me')return identity();
    streamSignal=init.signal;
    return new Response(new ReadableStream({start(output){upstream=output;},cancel(){cancelled=true;}}),{headers:{'Content-Type':'text/event-stream'}});
  };
  const answer=await proxyBffRequest(request({'Last-Event-ID':'42',Authorization:'Bearer untrusted'}),context);
  assert.equal(answer.status,200);
  assert.equal(calls[1].headers.get('Authorization'),'Bearer test-session');
  assert.equal(calls[1].headers.get('Cookie'),null);
  assert.equal(calls[1].headers.get('Last-Event-ID'),'42');
  assert.equal(answer.headers.get('X-Mairie360-Stream-Account'),'alice');
  assert.equal(answer.headers.get('X-Accel-Buffering'),'no');
  assert.equal(timers.find(timer=>timer.delay===30000).cleared,true);
  // Simulate elapsed time: only uncleared deadlines can abort the connection.
  timers.filter(timer=>timer.delay<=16000&&!timer.cleared).forEach(timer=>timer.callback());
  assert.equal(streamSignal.aborted,false);
  const reader=answer.body.getReader();upstream.enqueue(new TextEncoder().encode('data: later\n\n'));
  assert.equal(new TextDecoder().decode((await reader.read()).value),'data: later\n\n');
  await reader.cancel();assert.equal(cancelled,true);assert.equal(streamSignal.aborted,true);
});

test('cross-site requests cannot open a stream or probe another service', async()=>{
  process.env.BFF_MESSAGE_BASE_URL='http://bff.example';let calls=0;
  global.fetch=async()=>{calls++;return identity();};
  const answer=await proxyBffRequest(request({'Sec-Fetch-Site':'cross-site'}),context);
  assert.equal(answer.status,403);assert.equal(calls,0);
});

test('invalid stream bodies and authentication failures never become successful reception', async()=>{
  process.env.BFF_MESSAGE_BASE_URL='http://bff.example';
  for(const [upstream,expected] of [[()=>Response.json({}),502],[()=>Response.json({error:{message:'expired'}},{status:401}),401],[()=>Response.json({error:{message:'unavailable'}},{status:404}),404]]){
    global.fetch=async url=>new URL(url).pathname==='/me'?identity():upstream();
    const answer=await proxyBffRequest(request(),context);
    assert.equal(answer.status,expected);
    assert.equal(answer.headers.get('Cache-Control'),'no-store');
    assert.equal(answer.headers.get('Content-Type').includes('event-stream'),false);
  }
});

test('renewed access and refresh cookies reach the browser before the long-lived stream', async t=>{
  const previousLogin=process.env.LOGIN_FRONT_URL,previousMessage=process.env.MESSAGE_FRONT_URL;
  t.after(()=>{for(const [key,value] of [['LOGIN_FRONT_URL',previousLogin],['MESSAGE_FRONT_URL',previousMessage]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
  process.env.LOGIN_FRONT_URL='http://login.example';process.env.MESSAGE_FRONT_URL='http://localhost';
  process.env.BFF_MESSAGE_BASE_URL='http://bff.example';
  let probes=0;const calls=[];
  global.fetch=async (url,init)=>{
    const target=new URL(url),headers=new Headers(init.headers);calls.push({path:target.pathname,headers});
    if(target.pathname==='/api/auth/refresh'){
      const response=Response.json({message:'Session renewed'});
      response.headers.append('Set-Cookie','accessToken=renewed-access; Path=/; HttpOnly; SameSite=Lax');
      response.headers.append('Set-Cookie','refreshToken=renewed-refresh; Path=/; HttpOnly; SameSite=Lax');
      return response;
    }
    if(target.pathname==='/me')return ++probes===1?Response.json({error:{message:'expired'}},{status:401}):identity();
    return new Response(': heartbeat\n\n',{headers:{'Content-Type':'text/event-stream'}});
  };
  const incoming=new NextRequest('http://localhost/stream',{headers:{cookie:'accessToken=old-access; refreshToken=old-refresh'}});
  const answer=await proxyBffRequest(incoming,context);
  assert.equal(answer.status,200);
  assert.ok(calls.some(call=>call.path==='/api/auth/refresh'));
  assert.equal(calls.at(-1).headers.get('Authorization'),'Bearer renewed-access');
  assert.equal(calls.at(-1).headers.get('Cookie'),null);
  assert.ok(answer.headers.getSetCookie().some(cookie=>cookie.startsWith('accessToken=renewed-access;')));
  assert.ok(answer.headers.getSetCookie().some(cookie=>cookie.startsWith('refreshToken=renewed-refresh;')));
  assert.equal(await answer.text(),': heartbeat\n\n');
});
