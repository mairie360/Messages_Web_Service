"""Temporary: adds browser tracing to the RGAA engine checked out in cicd-repo (debug branch only)."""
p = 'cicd-repo/tests/a11y/states.mjs'
s = open(p).read()
fail = "    result.error = error.message.split(\"\\n\")[0];\n"
assert s.count(fail) == 1
s = s.replace(fail, fail + r"""    try {
      const html = await page.evaluate(() => [...document.querySelectorAll('[data-radix-popper-content-wrapper],[role=menu],[role=listbox],[role=dialog],[data-state=open],[aria-expanded],[role=combobox],[aria-haspopup]')].map((n) => `${n.tagName} ${n.getAttribute('role')} state=${n.getAttribute('data-state')} style=${n.getAttribute('style')} rect=${JSON.stringify(n.getBoundingClientRect())} :: ${n.outerHTML.slice(0, 600)}`).join('\n') + `\nactive=${document.activeElement?.outerHTML?.slice(0, 300)}`);
      console.log(`DBG [${state.id}] FAILDUMP step=${step}\n${html}`);
    } catch (e) { console.log(`DBG [${state.id}] FAILDUMP error ${e}`); }
""")
open(p, 'w').write(s)
print('patched')
