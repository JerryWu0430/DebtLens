type Dependency = {
  from: string;
  to: string;
  type: "import" | "call" | "extends" | "implements";
};

type Blocker = {
  file: string;
  severity: "low" | "medium" | "high" | "critical";
};

/**
 * Generate mermaid flowchart from dependencies
 */
export function generateMermaidCode(
  dependencies: Dependency[],
  blockers: Blocker[] = []
): string {
  if (!dependencies || dependencies.length === 0) {
    return "";
  }

  // Collect unique nodes
  const nodes = new Set<string>();
  dependencies.forEach((dep) => {
    nodes.add(dep.from);
    nodes.add(dep.to);
  });

  // Map file paths to short IDs
  const nodeIds = new Map<string, string>();
  let idCounter = 0;
  nodes.forEach((node) => {
    nodeIds.set(node, `N${idCounter++}`);
  });

  // Get blocker files for highlighting
  const blockerFiles = new Set(blockers.map((b) => b.file));
  const criticalFiles = new Set(
    blockers.filter((b) => b.severity === "critical").map((b) => b.file)
  );
  const highFiles = new Set(
    blockers.filter((b) => b.severity === "high").map((b) => b.file)
  );

  // Build mermaid code
  const lines: string[] = ["flowchart TD"];

  // Add node definitions with labels
  nodes.forEach((node) => {
    const id = nodeIds.get(node)!;
    const shortName = node.split("/").pop() || node;
    lines.push(`  ${id}["${shortName}"]`);
  });

  // Add edges
  dependencies.forEach((dep) => {
    const fromId = nodeIds.get(dep.from)!;
    const toId = nodeIds.get(dep.to)!;
    lines.push(`  ${fromId} --> ${toId}`);
  });

  // Style blocker nodes
  nodes.forEach((node) => {
    const id = nodeIds.get(node)!;
    if (criticalFiles.has(node)) {
      lines.push(`  style ${id} fill:#dc2626,stroke:#b91c1c,color:#fff`);
    } else if (highFiles.has(node)) {
      lines.push(`  style ${id} fill:#ea580c,stroke:#c2410c,color:#fff`);
    } else if (blockerFiles.has(node)) {
      lines.push(`  style ${id} fill:#eab308,stroke:#ca8a04,color:#000`);
    }
  });

  return lines.join("\n");
}
