export type TreeParentScope =
  | { kind: "root" }
  | { kind: "branch"; parentCid: string; branch: "yes" | "no" };

export interface TreeNodeLike {
  cid: string;
  branches?: { yes: TreeNodeLike[]; no: TreeNodeLike[] };
}

export function insertStepAt<T extends TreeNodeLike>(
  steps: T[],
  parent: TreeParentScope,
  index: number,
  node: T,
): T[] {
  if (parent.kind === "root") {
    const copy = [...steps];
    copy.splice(index, 0, node);
    return copy;
  }

  return steps.map((step) => {
    if (step.cid !== parent.parentCid || !step.branches) return step;
    const list = [...step.branches[parent.branch]];
    list.splice(index, 0, node);
    return { ...step, branches: { ...step.branches, [parent.branch]: list } } as T;
  });
}
