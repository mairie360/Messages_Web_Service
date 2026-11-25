'use strict';

// The RGAA engine opens every state in a new page whose pointer rests at (0, 0), over the desktop
// navigation band. Hovered, the band expands and pushes the module aside, then collapses when the
// first click moves the pointer: the target shifts between press and release and the click is lost
// (the state is not reached and the prod gate fails). Each interactive state must move the pointer
// onto the module and wait for the band to rest collapsed before acting.

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const yaml = readFileSync(join(__dirname, '..', 'rgaa.yaml'), 'utf8');
const states = yaml.slice(yaml.indexOf('\nstates:')).split(/\n  - id: /).slice(1);
const HOVER = "- hover: { selector: '.messages-module-stack' }";
const COLLAPSED = `- wait_for: { selector: 'aside.app-desktop-navigation[data-expanded="false"]' }`;

test('MAIR-1204: RGAA states move the pointer off the navigation band before clicking or typing', () => {
  const interactive = states.filter((state) => /- (click|fill|press):/.test(state));
  assert.ok(interactive.length >= 8, 'the interactive states are found');
  for (const state of interactive) {
    const id = state.split('\n')[0].trim();
    const firstAction = state.search(/- (click|fill|press):/);
    const hover = state.indexOf(HOVER);
    const collapsed = state.indexOf(COLLAPSED);
    assert.ok(hover >= 0 && hover < firstAction, `${id}: hovers the module before its first action`);
    assert.ok(collapsed > hover && collapsed < firstAction, `${id}: waits for the collapsed band before its first action`);
  }
});
