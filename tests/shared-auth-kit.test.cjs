const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadRootLayout } = require('./support/root-layout.cjs');
const loader = require('./support/load-ts.cjs');
const load = file => loader.requireSrc ? loader.requireSrc(file) : loader.loadTs ? loader.loadTs(file) : loader.requireTs ? loader.requireTs('src/'+file) : require('../src/'+file);
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const root=path.resolve(__dirname,'..');

test('server cookies determine Admin navigation before any role network request',async()=>{
  const bag={};
  const {Layout,Shell}=loadRootLayout(()=>({Layout:load('app/layout.tsx').default,Shell:require('@mairie360/lib-components/shell').AccessibleShell}),bag);
  for(const [role,expected] of [['Admin',true],['Responsable',false],['User',false],[undefined,false]]) {
    bag.accessToken='e30.'+Buffer.from(JSON.stringify({exp:Date.now()/1000+600,...(role?{role}:{})})).toString('base64url')+'.signature';
    const tree=await Layout({children:React.createElement(Shell,{isAdmin:!expected,hrefs:{admin:'/admin'}},'Page content')});
    const html=renderToStaticMarkup(tree);
    assert.equal(/<button[^>]*data-admin="true"/.test(html),expected, String(role));
    assert.doesNotMatch(html,new RegExp(bag.accessToken.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  }
});
