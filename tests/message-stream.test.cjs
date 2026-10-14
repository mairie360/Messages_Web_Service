const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireSrc } = require('./support/load-ts.cjs');
const { createSseParser } = requireSrc('lib/sse-frames.ts');
const { receiveMessageStream, isMessageStreamEvent } = requireSrc('lib/message-stream.ts');
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const encoder = new TextEncoder();
const payload = id => `id: ${id}\ndata: {"type":"NEW_MSG","conversationId":"2"}\n\n`;
const response = (text, headers={}) => new Response(new ReadableStream({start(stream) {stream.enqueue(encoder.encode(text));stream.close();}}), {headers:{'Content-Type':'text/event-stream',...headers}});
const handlers = (overrides={}) => ({signal:new AbortController().signal,cursor:{lastEventId:'',seen:[]},onEvent:()=>{},onState:()=>{},onAuthenticationError:()=>{},wait:async()=>{},...overrides});

test('SSE framing handles CRLF chunk boundaries, comments, multi-line JSON and cursor reset', () => {
  const frames=[], parser=createSseParser(frame=>frames.push(frame));
  for (const chunk of [': keep alive\r','\nid: 12\r\nevent: changed\r\ndata: {\r\n','data: "type":"NEW_MSG",\r\ndata: "conversationId":"2"}\r\n\r','\nretry: 0\nid:\n\n']) parser.push(chunk);
  assert.equal(frames[0].id,'12');
  assert.equal(frames[0].event,'changed');
  assert.deepEqual(JSON.parse(frames[0].data),{type:'NEW_MSG',conversationId:'2'});
  assert.equal(frames[1].id,'');
  assert.equal(frames[1].retry,1000);
  parser.push('data: ignored unfinished record'); parser.end();
  assert.equal(frames.length,2);
});

test('frame limits apply per event, incomplete oversized frames fail and NUL cursors are ignored', () => {
  const frames=[], parser=createSseParser(frame=>frames.push(frame),100);
  parser.push(payload(1).repeat(30));
  assert.equal(frames.length,30);
  parser.push('id: bad\u0000cursor\ndata: {}\n\n');
  assert.equal(frames.at(-1).id,undefined);
  assert.throws(()=>parser.push('x'.repeat(101)),/volumineux/);
  assert.equal(isMessageStreamEvent({type:'NEW_MSG',conversationId:2}),false);
  assert.equal(isMessageStreamEvent({type:'',conversationId:'2'}),false);
  assert.equal(isMessageStreamEvent(null),false);
});

test('reconnection forwards Last-Event-ID and duplicate IDs are delivered only once', async () => {
  const calls=[], events=[],cursor={lastEventId:'',seen:[]};
  global.fetch=async (url, init)=>{calls.push({url,headers:new Headers(init.headers)});return response(calls.length===1?payload(11):payload(11)+payload(12));};
  await receiveMessageStream(handlers({cursor,attempts:2,onEvent:event=>events.push(event)}));
  assert.equal(calls.length,2);
  assert.equal(calls[0].url,'/stream');
  assert.equal(calls[0].headers.get('Accept'),'text/event-stream');
  assert.equal(calls[1].headers.get('Last-Event-ID'),'11');
  assert.equal(events.length,2);
  assert.equal(cursor.lastEventId,'12');
});

test('401 and opaque authentication redirects stop reconnecting and use existing recovery', async () => {
  for (const makeResponse of [()=>Response.json({error:{message:'expired'}},{status:401}),()=>({type:'opaqueredirect'})]) {
    let calls=0, recovered=0;
    global.fetch=async()=>{calls++;return makeResponse();};
    await receiveMessageStream(handlers({onAuthenticationError:()=>{recovered++;}}));
    assert.equal(calls,1); assert.equal(recovered,1);
  }
});

test('an account change cancels the body before any message reaches the former user', async () => {
  const events=[];let changed=0;
  global.fetch=async()=>response(payload(1),{'X-Mairie360-Stream-Account':'bob'});
  await receiveMessageStream(handlers({account:'alice',onAccountChange:()=>{changed++;},onEvent:event=>events.push(event)}));
  assert.equal(changed,1); assert.deepEqual(events,[]);
});

test('abort releases the stream and prevents later frames from the same chunk', async () => {
  const controller=new AbortController();let cancelled=false,events=0;
  global.fetch=async()=>new Response(new ReadableStream({start(stream){stream.enqueue(encoder.encode(payload(1)+payload(2)));},cancel(){cancelled=true;}}),{headers:{'Content-Type':'text/event-stream'}});
  await receiveMessageStream(handlers({signal:controller.signal,onEvent:()=>{events++;controller.abort();}}));
  assert.equal(events,1); assert.equal(cancelled,true);
});

test('retry traffic and duplicate history remain bounded', async () => {
  let calls=0;const waits=[],cursor={lastEventId:'',seen:[]};
  global.fetch=async()=>{calls++;return calls===1?response(Array.from({length:105},(_,id)=>payload(id)).join('')):Response.json({}, {status:503});};
  await receiveMessageStream(handlers({cursor,attempts:100,wait:async milliseconds=>{waits.push(milliseconds);}}));
  assert.equal(calls,5); assert.equal(waits.length,4); assert.equal(cursor.seen.length,100);
  assert.deepEqual(waits,[1000,2000,4000,8000]);
});
