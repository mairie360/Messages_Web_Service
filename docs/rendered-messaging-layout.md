# Rendered messaging layout

The layout suite mounts the actual page with `react-dom/client`, real hooks, published UI components and the consumer stylesheet. Existing frontend route handlers communicate through `FrontNetwork` with the existing contract mocks. Rendered properties cover the shell, sidebar commands, drawer opening/closing, card/outer containers, independently prepared scroll regions, actual pane switching and unavailable-bootstrap feedback with its explicit retry command.

The frame does not declare overflow: JSDOM omits that initial computed shorthand, so an empty value is normalized only to its initial `visible` value. Explicit `hidden`, `clip` or `auto` still fails the check. Shadows are parsed into numeric lengths and normalized colors; equivalent color notation/order is accepted.

Two CSSOM configuration policies retain breakpoint-to-selector association, desktop tracks, narrow-pane display rules, mobile insets, small-text tokens/classes, shared header/footer height protection and focus outlines. JSDOM does not compile Tailwind, evaluate media queries, measure native scrolling/geometry or prove visible outer shadows. Browser checks on integrated main and refreshed local-current remain separate.

Two existing fixture exceptions remain explicit: the published GET thread response model is swapped, and the published bootstrap response statuses do not include the existing 503 refusal fixture. The suite reuses the canonical fixtures already used by `messages-page.contract-mocks.test.cjs`; it does not certify those two replies strictly against the published response schema. Other mocked replies and operations retain their contract checks. Presentation actions only emit GET requests and do not automatically acknowledge messages. API/BFF sources and contracts are unchanged.

JSDOM `30.1.1` is a development-only dependency. Run these tests with a supported runtime such as Node `24.19.0`; CI uses `24.21.0`. The exact verified public dependency closure is shared with the integrated Calendar lock while every existing Message lock entry and production dependency is preserved. Fresh Message CI installation remains required for that consumer.

```sh
node --test --test-concurrency=1 tests/messages-layout.test.cjs tests/messages-rendered-layout.test.cjs
```
