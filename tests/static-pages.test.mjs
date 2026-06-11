import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";

import { mountStaticPageRoutes, staticPageRoutes } from "../server/static-pages.js";

test("static info pages register clean footer URLs", () => {
  assert.deepEqual(staticPageRoutes, [
    { route: "/how-to-play", file: "how-to-play.html" },
    { route: "/about", file: "about.html" },
    { route: "/privacy", file: "privacy.html" },
    { route: "/terms", file: "terms.html" },
    { route: "/contact", file: "contact.html" }
  ]);
});

test("static info page handlers serve the matching html file", () => {
  const registered = [];
  const app = {
    get(route, handler) {
      registered.push({ route, handler });
    }
  };

  mountStaticPageRoutes(app, "/tmp/nanamicat-pages");

  const privacy = registered.find((item) => item.route === "/privacy");
  let sentFile = "";
  privacy.handler({}, {
    sendFile(file) {
      sentFile = file;
    }
  });

  assert.equal(sentFile, join("/tmp/nanamicat-pages", "privacy.html"));
});
