const assert = require('node:assert/strict');
const { test } = require('node:test');
const { classifySource } = require('../scripts/coverage-source-kind.cjs');

test('only erased type statements are classified as non-executable', () => {
  const source = "import type { Shape } from './shape'; export type Alias = Shape; export interface View { id: string };";
  // The trailing empty statement is deliberately rejected by the strict classifier.
  assert.equal(classifySource('src/types.ts', source).executable, true);
  const typeOnly = source.slice(0, -1);
  assert.deepEqual(classifySource('src/types.ts', typeOnly), { kind: 'type-only', executable: false, reason: 'Every top-level statement is an erased type declaration, type import or type export.' });
  assert.equal(classifySource('src/reexport.ts', "export type { Shape } from './shape';").executable, false);
});
for (const [name, source] of [
  ['value constant', 'export const count = 1;'],
  ['function', 'export function calculate() { return 1; }'],
  ['class', 'export class View {}'],
  ['enum', 'export enum Kind { One }'],
  ['const enum', 'export const enum Kind { One }'],
  ['side-effect import', "import './effect';"],
  ['value import', "import { value } from './value'; export type Alias = string;"],
  ['type specifier inside a value import', "import { type Shape } from './shape';"],
  ['empty export', 'export {};'],
  ['namespace', 'export namespace Group { export type Shape = string; }'],
  ['ambient module', "declare module 'fixture' { export type Shape = string; }"],
  ['value re-export', "export { value } from './value';"],
  ['export assignment', 'export default 1;'],
  ['ambient function in a regular module', 'export declare function calculate(): number;'],
  ['mixed types and runtime', 'export type Alias = string; console.log(1);'],
]) test(`${name} cannot be classified as a non-executable type-only module`, () => {
  assert.equal(classifySource('src/module.ts', source).executable, true);
});
test('declaration files remain explicitly identified separately from executable source', () => {
  assert.equal(classifySource('src/contracts/bff.d.ts', 'export interface Client { run(): void; }').kind, 'declaration');
});
test('parse errors fail classification instead of inventing a coverage score', () => {
  assert.throws(() => classifySource('src/types.ts', 'export type Invalid = {'), /invalid TypeScript/);
  assert.throws(() => classifySource('src/contracts/bff.d.ts', 'declare class Broken {'), /invalid TypeScript/);
  assert.throws(() => classifySource('src/contracts/bff.d.ts', 'export function execute() {}'), /explicit non-runtime classification/);
});
