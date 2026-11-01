import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

// Component visibility includes consumer styling; geometry is checked in the browser.
const consumerStyles = document.createElement("style");
consumerStyles.textContent = readFileSync(createRequire(import.meta.url).resolve("@mairie360/lib-components/styles.css"), "utf8") + "\n" + readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
document.head.append(consumerStyles);
document.body.classList.add("mairie-ui");
