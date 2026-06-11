import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("AdSense verification script is present as a static head tag", () => {
  assert.match(
    html,
    /<script\s+async\s+src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-4282000221262612"\s+crossorigin="anonymous"><\/script>/i
  );
});

test("ads configuration uses the same publisher id as the verification script", () => {
  assert.match(html, /clientId:\s*"ca-pub-4282000221262612"/);
});
