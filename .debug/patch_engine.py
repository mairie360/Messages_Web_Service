"""Temporary: adds browser tracing to the RGAA engine checked out in cicd-repo (debug branch only)."""
p = 'cicd-repo/tests/a11y/states.mjs'
s = open(p).read()
anchor = "  const page = await context.newPage();\n"
assert s.count(anchor) == 1
s = s.replace(anchor, anchor + r"""  await page.addInitScript(() => {
    const t0 = performance.now(); const log = (window.__dbgLog = []);
    const note = (m) => log.push(`${Math.round(performance.now() - t0)} ${m}`);
    const desc = (el) => el ? `${el.tagName}${el.id ? '#' + el.id : ''}.${String(el.className).slice(0, 60)}[${el.getAttribute?.('aria-label') ?? ''}]` : 'null';
    const scrolls = () => [...document.querySelectorAll('*')].filter((n) => n.scrollTop || n.scrollLeft).map((n) => `${desc(n)}=${n.scrollTop},${n.scrollLeft}`).join(' ');
    for (const t of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click']) document.addEventListener(t, (e) => {
      const b = document.querySelector('[aria-label="Mentionner une personne"]') || document.querySelector('[aria-label="Insérer un emoji"]');
      const r = b?.getBoundingClientRect();
      const under = document.elementFromPoint(e.clientX, e.clientY);
      note(`${t} at ${e.clientX},${e.clientY} target=${desc(e.target?.closest?.('button') ?? e.target)} under=${desc(under?.closest?.('button') ?? under)} btn=${r ? [r.x, r.y, r.width, r.height].map(Math.round).join(',') : '-'} win=${scrollX},${scrollY} scrolls=[${scrolls()}]`);
    }, true);
    window.addEventListener('focus', () => note('window focus')); window.addEventListener('blur', () => note('window blur'));
    let n = 0; let last = '';
    new MutationObserver(() => {
      const input = document.querySelector('[role=combobox][aria-label="Écrire un message"]');
      if (input && !input.dataset.dbg) input.dataset.dbg = String(++n);
      const st = `composer#${input?.dataset.dbg} val=${JSON.stringify(input?.value ?? null)} disabled=${input?.disabled} menu=${document.querySelectorAll('[role=menu]').length} listbox=${document.querySelectorAll('[role=listbox]').length} emoji=${document.querySelectorAll('[aria-label^="Ajouter "]').length} hydrated=${document.querySelectorAll('[data-hydrated]').length} composers=${document.querySelectorAll('[aria-label="Écrire un message"]').length}`;
      if (st !== last) { last = st; note(st); }
    }).observe(document, { subtree: true, childList: true, attributes: true });
  });
""")
fail = "    result.error = error.message.split(\"\\n\")[0];\n"
assert s.count(fail) == 1
s = s.replace(fail, fail + r"""    try {
      const html = await page.evaluate(() => [...document.querySelectorAll('[data-radix-popper-content-wrapper],[role=menu],[role=listbox],[role=dialog],[data-state=open],[aria-expanded],[role=combobox],[aria-haspopup]')].map((n) => `${n.tagName} ${n.getAttribute('role')} state=${n.getAttribute('data-state')} style=${n.getAttribute('style')} rect=${JSON.stringify(n.getBoundingClientRect())} :: ${n.outerHTML.slice(0, 600)}`).join('\n') + `\nactive=${document.activeElement?.outerHTML?.slice(0, 300)}\nLOG\n${(window.__dbgLog ?? []).join('\n')}`);
      console.log(`DBG [${state.id}] FAILDUMP step=${step}\n${html}`);
    } catch (e) { console.log(`DBG [${state.id}] FAILDUMP error ${e}`); }
""")
open(p, 'w').write(s)
print('patched')
