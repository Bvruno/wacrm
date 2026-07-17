import { describe, expect, it } from "vitest";

import { insertStepAt } from "./step-tree";

describe("insertStepAt", () => {
  it("inserts a step into the root list", () => {
    const initial = [{ cid: "a", step_type: "send_message", step_config: {} } as any];
    const node = { cid: "b", step_type: "wait", step_config: {} } as any;

    const next = insertStepAt(initial, { kind: "root" } as any, 0, node);

    expect(next).toHaveLength(2);
    expect(next[0]).toBe(node);
  });

  it("inserts a step into a branch list", () => {
    const initial = [
      {
        cid: "parent",
        step_type: "condition",
        step_config: {},
        branches: { yes: [], no: [] },
      } as any,
    ];
    const node = { cid: "child", step_type: "send_message", step_config: {} } as any;

    const next = insertStepAt(initial, { kind: "branch", parentCid: "parent", branch: "yes" } as any, 0, node);

    expect(next[0].branches.yes).toHaveLength(1);
    expect(next[0].branches.yes[0]).toBe(node);
  });
});
