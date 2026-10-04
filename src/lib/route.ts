// Path -> screen. No router: navigation is plain links (specs/projects.md §4).
export type Route =
  | { name: "projects" }
  | { name: "new-project" }
  | { name: "project"; id: string }
  | { name: "not-found" };

export function parseRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { name: "projects" };
  if (path === "/projects/new") return { name: "new-project" };
  const m = path.match(/^\/projects\/([^/]+)$/);
  return m ? { name: "project", id: decodeURIComponent(m[1]) } : { name: "not-found" };
}
