import type { WorkspaceLeaf } from "obsidian";

type HiddenPanel = { panel: HTMLElement | null };

/** Hide presentation only. Leaves, xterm instances and PTYs stay attached. */
export class TerminalVisibility {
  private hidden = new Map<WorkspaceLeaf, HiddenPanel>();

  isHidden(leaf: WorkspaceLeaf): boolean {
    const panel = leaf.view.containerEl.closest<HTMLElement>(".workspace-tabs");
    return this.hidden.has(leaf) || [...this.hidden.values()].some(state => state.panel !== null && state.panel === panel);
  }

  hide(leaf: WorkspaceLeaf, leaves: WorkspaceLeaf[]): WorkspaceLeaf | undefined {
    const panel = leaf.view.containerEl.closest<HTMLElement>(".workspace-tabs");
    const siblings = leaves.filter(other => other !== leaf && panel?.contains(other.view.containerEl));
    const sibling = siblings.find(other => other.view.getViewType() !== leaf.view.getViewType());
    // A mixed tab group stays visible: select a note instead of hiding its panel.
    const collapsed = sibling ? null : panel;
    this.hidden.set(leaf, {
      panel: collapsed,
    });
    collapsed?.classList.add("lean-terminal-collapsed");
    const outside = leaves.filter(other => other !== leaf && !panel?.contains(other.view.containerEl) && other.view.getViewType() !== leaf.view.getViewType());
    return sibling ?? outside.find(other => other.view.getViewType() === "markdown") ?? outside[0];
  }

  show(leaf: WorkspaceLeaf): void {
    const panel = leaf.view.containerEl.closest<HTMLElement>(".workspace-tabs");
    for (const [hiddenLeaf, state] of this.hidden) {
      if (hiddenLeaf === leaf || (state.panel !== null && state.panel === panel)) {
        this.restore(state);
        this.hidden.delete(hiddenLeaf);
      }
    }
  }

  reconcile(leaves: WorkspaceLeaf[]): void {
    for (const [leaf, state] of this.hidden) {
      if (!leaves.includes(leaf) || (state.panel && !state.panel.contains(leaf.view.containerEl)) ||
          (state.panel && leaves.some(other => state.panel!.contains(other.view.containerEl) && other.view.getViewType() !== leaf.view.getViewType()))) {
        this.restore(state);
        this.hidden.delete(leaf);
      }
    }
  }

  restoreAll(): void {
    for (const state of this.hidden.values()) this.restore(state);
    this.hidden.clear();
  }

  private restore(state: HiddenPanel): void {
    if (!state.panel) return;
    state.panel.classList.remove("lean-terminal-collapsed");
  }
}