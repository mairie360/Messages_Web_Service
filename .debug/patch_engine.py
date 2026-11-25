"""Temporary: adds browser tracing to the RGAA engine checked out in cicd-repo (debug branch only)."""
p = 'cicd-repo/tests/a11y/states.mjs'
s = open(p).read()
anchor = "  const page = await context.newPage();\n"
assert s.count(anchor) == 1
s = s.replace(anchor, anchor + r"""  const t0 = Date.now();
  const dbg = (m) => console.log(`DBG [${state.id}] +${Date.now() - t0}ms ${m}`);
  page.on('console', (m) => dbg(`console.${m.type()} ${m.text().slice(0, 300)}`));
  page.on('pageerror', (e) => dbg(`pageerror ${String(e).slice(0, 500)}`));
  page.on('requestfinished', (r) => { const u = r.url(); if (!/_next\/static|\.woff/.test(u)) r.response().then((res) => dbg(`req ${r.method()} ${u} ${res?.status()}`)).catch(() => {}); });
  page.on('requestfailed', (r) => dbg(`reqfail ${r.method()} ${r.url()} ${r.failure()?.errorText}`));
  page.on('websocket', (ws) => { dbg(`ws open ${ws.url()}`); ws.on('close', () => dbg('ws close')); });
  await page.exposeFunction('__dbg', (m) => dbg(`dom ${m}`));
  await page.addInitScript(() => {
    const log = (m) => window.__dbg && window.__dbg(m);
    ['focus', 'blur', 'resize'].forEach((e) => window.addEventListener(e, () => log('window ' + e)));
    document.addEventListener('visibilitychange', () => log('visibility ' + document.visibilityState));
    for (const t of ['pointerdown', 'click', 'keydown', 'focusin', 'focusout']) document.addEventListener(t, (e) => log(t + ' ' + (e.target?.closest?.('button,[role=menuitem],[role=option],textarea,input')?.getAttribute('aria-label') || e.target?.closest?.('button,[role=menuitem]')?.textContent?.slice(0, 30) || e.target?.tagName)), true);
    let last = '';
    const check = () => {
      const q = (s) => document.querySelectorAll(s).length;
      const s = `menu=${q('[role=menu]')} item=${q('[role=menuitem]')} listbox=${q('[role=listbox]')} option=${q('[role=option]')} dialog=${q('[role=dialog]')} popper=${q('[data-radix-popper-content-wrapper]')} hydrated=${q('[data-hydrated]')} composer=${JSON.stringify(document.querySelector('[role=combobox]')?.value ?? null)} busy=${q('[aria-busy=true]')}`;
      if (s !== last) { last = s; log(s); }
    };
    new MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  });
""")
fail = "    result.error = error.message.split(\"\\n\")[0];\n"
assert s.count(fail) == 1
s = s.replace(fail, fail + r"""    try {
      const html = await page.evaluate(() => [...document.querySelectorAll('[data-radix-popper-content-wrapper],[role=menu],[role=listbox],[role=dialog],[data-state=open]')].map((n) => `${n.tagName} ${n.getAttribute('role')} state=${n.getAttribute('data-state')} style=${n.getAttribute('style')} rect=${JSON.stringify(n.getBoundingClientRect())} :: ${n.outerHTML.slice(0, 600)}`).join('\n') + `\nactive=${document.activeElement?.outerHTML?.slice(0, 300)}`);
      console.log(`DBG [${state.id}] FAILDUMP step=${step}\n${html}`);
    } catch (e) { console.log(`DBG [${state.id}] FAILDUMP error ${e}`); }
""")
open(p, 'w').write(s)
print('patched')
