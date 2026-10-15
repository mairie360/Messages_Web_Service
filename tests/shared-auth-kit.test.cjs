const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { loadRootLayout } = require('./support/root-layout.cjs');
const loader = require('./support/load-ts.cjs');
const load = file => loader.requireSrc ? loader.requireSrc(file) : loader.loadTs ? loader.loadTs(file) : loader.requireTs ? loader.requireTs('src/'+file) : require('../src/'+file);
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const root=path.resolve(__dirname,'..');

test('the shared package is the exact reviewed artifact, not eight source copies',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
  const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json')));
  const provenance=JSON.parse(fs.readFileSync(path.join(root,'vendor/front-kit-provenance.json')));
  assert.equal(manifest.dependencies['@mairie360/front-kit'],'file:vendor/mairie360-front-kit-0.1.0.tgz');
  const artifact=fs.readFileSync(path.join(root,'vendor/mairie360-front-kit-0.1.0.tgz'));
  assert.equal(createHash('sha256').update(artifact).digest('hex'),provenance.sha256);
  assert.equal(lock.packages['node_modules/@mairie360/front-kit'].integrity,provenance.integrity);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'node_modules/@mairie360/front-kit/package.json'))).version,provenance.version);
});

test('server cookies determine Admin navigation before any role network request',async()=>{
  const bag={};
  const {Layout,Shell}=loadRootLayout(()=>({Layout:load('app/layout.tsx').default,Shell:load('components/accessible-shell.tsx').default}),bag);
  for(const [role,expected] of [['Admin',true],['Responsable',false],['User',false],[undefined,false]]) {
    bag.accessToken='e30.'+Buffer.from(JSON.stringify({exp:Date.now()/1000+600,...(role?{role}:{})})).toString('base64url')+'.signature';
    const tree=await Layout({children:React.createElement(Shell,{isAdmin:!expected,hrefs:{admin:'/admin'}},'Page content')});
    const html=renderToStaticMarkup(tree);
    assert.equal(/<button[^>]*data-admin="true"/.test(html),expected, String(role));
    assert.doesNotMatch(html,new RegExp(bag.accessToken.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  }
});
