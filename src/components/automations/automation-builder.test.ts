import { describe, expect, it } from 'vitest';

import { insertStepAt } from './step-tree';
import type { TreeNodeLike, TreeParentScope } from './step-tree';

interface TestNode extends TreeNodeLike {
  cid: string;
  step_type: string;
  step_config: Record<string, unknown>;
}

describe('insertStepAt', () => {
  it('inserts a step into the root list', () => {
    const initial: TestNode[] = [
      { cid: 'a', step_type: 'send_message', step_config: {} },
    ];
    const node: TestNode = {
      cid: 'b',
      step_type: 'wait',
      step_config: {},
    };

    const next = insertStepAt(initial, { kind: 'root' }, 0, node);

    expect(next).toHaveLength(2);
    expect(next[0]).toBe(node);
  });

  it('inserts a step into a branch list', () => {
    const initial: TestNode[] = [
      {
        cid: 'parent',
        step_type: 'condition',
        step_config: {},
        branches: { yes: [], no: [] },
      },
    ];
    const node: TestNode = {
      cid: 'child',
      step_type: 'send_message',
      step_config: {},
    };

    const parentScope: TreeParentScope = {
      kind: 'branch',
      parentCid: 'parent',
      branch: 'yes',
    };
    const next = insertStepAt(initial, parentScope, 0, node);

    expect(next[0].branches?.yes).toHaveLength(1);
    expect(next[0].branches?.yes[0]).toBe(node);
  });
});
