const test = require('node:test');
const assert = require('node:assert/strict');
const loader=require('./support/load-ts.cjs');
const loadSrc=file=>loader.requireSrc?loader.requireSrc(file):loader.loadTs?loader.loadTs(file):require('../src/'+file);

test('instance timezone controls instants independently from the browser timezone', () => {
  const saved = process.env.TZ, instance = process.env.INSTANCE_TIMEZONE;
  process.env.TZ = 'Pacific/Honolulu'; process.env.INSTANCE_TIMEZONE = 'Indian/Reunion';
  try { const { formatMessageTimestamp } = loadSrc('lib/message-timestamps.ts'); assert.match(formatMessageTimestamp('2026-10-14T21:30:00Z'), /15\/10.*01:30/); }
  finally { if(saved===undefined)delete process.env.TZ;else process.env.TZ=saved;if(instance===undefined)delete process.env.INSTANCE_TIMEZONE;else process.env.INSTANCE_TIMEZONE=instance; }
});
