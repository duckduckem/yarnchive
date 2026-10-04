import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRoute } from "./route.ts";

test("parseRoute: list, new, project, trailing slash, unknown", () => {
  assert.deepEqual(parseRoute("/"), { name: "projects" });
  assert.deepEqual(parseRoute("/projects/new"), { name: "new-project" });
  assert.deepEqual(parseRoute("/projects/new/"), { name: "new-project" });
  assert.deepEqual(parseRoute("/projects/abc-123"), { name: "project", id: "abc-123" });
  assert.deepEqual(parseRoute("/knit/nurtured/1"), { name: "not-found" });
  assert.deepEqual(parseRoute("/projects"), { name: "not-found" });
});
