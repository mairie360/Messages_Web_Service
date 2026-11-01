const { readFileSync } = require('node:fs');
const postcss = require('postcss');

// JSDOM does not implement Tailwind's @property and nested layers. Read only the
// published semantic custom-property rules; native Chromium validates full CSS.
function sharedThemeCss() {
  const source = postcss.parse(readFileSync(require.resolve('@mairie360/lib-components/styles.css'), 'utf8'));
  const output = postcss.root();
  source.walkRules(rule => {
    if (rule.selector !== ':root' && rule.selector !== 'html[data-theme="dark"]') return;
    const theme = postcss.rule({ selector: rule.selector });
    rule.each(decl => {
      if (decl.type === 'decl' && decl.prop.startsWith('--mairie-')) theme.append(decl.clone());
    });
    if (theme.nodes.length) output.append(theme);
  });
  if (!output.nodes.length) throw new Error('Published shared theme is missing.');
  return output.toString();
}
module.exports = { sharedThemeCss };
