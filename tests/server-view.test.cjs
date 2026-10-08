const assert = require('node:assert/strict');
const { test } = require('node:test');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
installReactRuntime();
const React = require('react');

function Counter({ label }) {
  const [value, setValue] = React.useState(0);
  return React.createElement('button', { name: label, onClick: () => setValue(value + 1) }, `${label}:${value}`);
}

test('nested child arrays keep real component state and interactions observable', async () => {
  function Nested() {
    return React.createElement(React.Fragment, null, [[React.createElement(Counter, { key: 'a', label: 'A' })]], false);
  }
  const view = mount(React.createElement(Nested));
  try {
    await view.click(props => props.name === 'A');
    assert.match(view.text(), /A:1/);
    assert.equal(view.find('Counter').length, 1);
  } finally { view.unmount(); }
});

test('a changed key resets a single child even outside a mapped array', async () => {
  function Parent() {
    const [generation, setGeneration] = React.useState(0);
    return React.createElement(React.Fragment, null,
      React.createElement('button', { name: 'reset', onClick: () => setGeneration(generation + 1) }, 'Reset'),
      React.createElement('section', null, React.createElement(Counter, { key: generation, label: 'B' })));
  }
  const view = mount(React.createElement(Parent));
  try {
    await view.click(props => props.name === 'B');
    assert.match(view.text(), /B:1/);
    await view.click(props => props.name === 'reset');
    assert.match(view.text(), /B:0/);
  } finally { view.unmount(); }
});

test('hidden panels retain mounted state but cannot receive visible interactions', async () => {
  function Panels() {
    const [selected, select] = React.useState('A');
    return React.createElement(React.Fragment, null,
      React.createElement('button', { name: 'switch', onClick: () => select(selected === 'A' ? 'B' : 'A') }, 'Switch'),
      ['A', 'B'].map(label => React.createElement('div', { key: label, hidden: selected !== label },
        React.createElement(Counter, { label }))));
  }
  const view = mount(React.createElement(Panels));
  try {
    assert.equal(view.hostElements(props => props.name === 'B').length, 0);
    await view.click(props => props.name === 'A');
    await view.click(props => props.name === 'switch');
    assert.equal(view.hostElements(props => props.name === 'A').length, 0);
    assert.equal(view.visibleProps('Counter').label, 'B');
    await view.click(props => props.name === 'switch');
    assert.equal(view.visibleProps('Counter').label, 'A');
    assert.equal(view.hostElements(props => props.name === 'A')[0].text, 'A:1');
    assert.equal(view.find('Counter').length, 2);
  } finally { view.unmount(); }
});
