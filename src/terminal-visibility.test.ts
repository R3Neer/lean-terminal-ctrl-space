import { describe, it, expect } from "vitest";
import type { WorkspaceLeaf } from "obsidian";
import { TerminalVisibility } from "./terminal-visibility";

function panel(display = "", priority = "") {
  const members = new Set<unknown>();
  const values = { display, priority };
  return {
    members, values,
    contains: (node: unknown) => members.has(node),
    classList: {
      add: () => { values.display = "none"; },
      remove: () => { values.display = display; values.priority = priority; },
    },
    style: {
      getPropertyValue: () => values.display,
      getPropertyPriority: () => values.priority,
      setProperty: (_: string, value: string, rank = "") => { values.display = value; values.priority = rank; },
      removeProperty: () => { values.display = ""; values.priority = ""; },
    },
  };
}
function leaf(group: ReturnType<typeof panel>, type = "terminal") {
  const containerEl = { closest: () => group };
  group.members.add(containerEl);
  return { view: { containerEl, getViewType: () => type } } as unknown as WorkspaceLeaf;
}

describe("terminal visibility without leaf disposal", () => {
  it("collapses and restores a terminal-only split, preserving its original CSS", () => {
    const group = panel("flex", "important"), terminal = leaf(group), note = leaf(panel(), "markdown");
    const visibility = new TerminalVisibility();
    expect(visibility.hide(terminal, [terminal, note])).toBe(note);
    expect(group.values.display).toBe("none");
    expect(visibility.isHidden(terminal)).toBe(true);
    visibility.show(terminal);
    expect(group.values).toEqual({display: "flex", priority: "important"});
    expect(visibility.isHidden(terminal)).toBe(false);
  });
  it("never hides a note in a shared tab group", () => {
    const group = panel(), terminal = leaf(group), note = leaf(group, "markdown");
    const visibility = new TerminalVisibility();
    expect(visibility.hide(terminal, [terminal, note])).toBe(note);
    expect(group.values.display).toBe("");
    visibility.show(note);
    expect(visibility.isHidden(terminal)).toBe(true);
    visibility.show(terminal);
    expect(visibility.isHidden(terminal)).toBe(false);
  });
  it("restores the same group through another terminal tab", () => {
    const group = panel(), one = leaf(group), two = leaf(group);
    const visibility = new TerminalVisibility();
    visibility.hide(one, [one, two]);
    expect(visibility.isHidden(two)).toBe(true);
    visibility.show(two);
    expect(group.values.display).toBe("");
    expect(visibility.isHidden(one)).toBe(false);
  });
  it("unhides a group if a note is moved into it", () => {
    const group = panel(), terminal = leaf(group), visibility = new TerminalVisibility();
    visibility.hide(terminal, [terminal]);
    const note = leaf(group, "markdown");
    visibility.reconcile([terminal, note]);
    expect(group.values.display).toBe("");
    expect(visibility.isHidden(terminal)).toBe(false);
  });
  it("restores the old group if the terminal is moved or closed", () => {
    const group = panel(), terminal = leaf(group), visibility = new TerminalVisibility();
    visibility.hide(terminal, [terminal]);
    group.members.clear();
    visibility.reconcile([terminal]);
    expect(group.values.display).toBe("");
    visibility.hide(terminal, [terminal]);
    visibility.reconcile([]);
    expect(visibility.isHidden(terminal)).toBe(false);
  });
  it("preserves every terminal object over repeated hide/show and explicit cleanup", () => {
    const group = panel(), terminal = leaf(group), view = terminal.view;
    const visibility = new TerminalVisibility();
    for (let i = 0; i < 20; i++) { visibility.hide(terminal, [terminal]); visibility.show(terminal); }
    expect(terminal.view).toBe(view);
    visibility.hide(terminal, [terminal]);
    visibility.restoreAll();
    expect(group.values.display).toBe("");
    expect(visibility.isHidden(terminal)).toBe(false);
  });
});