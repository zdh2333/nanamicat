import { join } from "node:path";

export const staticPageRoutes = [
  { route: "/how-to-play", file: "how-to-play.html" },
  { route: "/about", file: "about.html" },
  { route: "/privacy", file: "privacy.html" },
  { route: "/terms", file: "terms.html" },
  { route: "/contact", file: "contact.html" }
];

export function mountStaticPageRoutes(app, pageRoot) {
  for (const { route, file } of staticPageRoutes) {
    app.get(route, (_request, response) => {
      response.sendFile(join(pageRoot, file));
    });
  }
}
