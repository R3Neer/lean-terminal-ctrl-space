import { describe, expect, it } from "vitest";
import type { Terminal } from "@xterm/xterm";
import { installWin32ControlSpace } from "./win32-control-space";
function setup() {
  const textarea = new EventTarget() as EventTarget & { ownerDocument: { activeElement: unknown } };
  textarea.ownerDocument = { activeElement: textarea };
  const callbacks = new Map<string, (p: number[]) => boolean>();
  const writes: string[] = []; let enabled = true, disposed = 0;
  const terminal = { textarea, parser: { registerCsiHandler: (k: { final: string }, cb: (p: number[]) => boolean) => {
    callbacks.set(k.final, cb); return { dispose: () => disposed++ };
  } } } as unknown as Terminal;
  const adapter = installWin32ControlSpace(terminal, d => writes.push(d), { enabled: () => enabled, diagnostics: () => false, sessionId: "A" });
  function emit(type: string, extra: object = {}) {
    const e = new Event(type, { cancelable: true });
    Object.assign(e, { code: "Space", key: " ", ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, repeat: false }, extra);
    textarea.dispatchEvent(e); return e;
  }
  return { textarea, callbacks, writes, emit, adapter, enableMode: () => callbacks.get("h")!([9001]), disable: () => enabled = false, disposed: () => disposed };
}
describe("Win32 Ctrl+Space routing", () => {
  it("requires negotiation", () => { const f=setup(); expect(f.emit("keydown").defaultPrevented).toBe(false); expect(f.writes).toEqual([]); });
  it("emits only a press and a physical release", () => { const f=setup(); f.enableMode(); f.emit("keydown"); f.emit("keypress"); f.emit("keyup"); expect(f.writes).toEqual(["\x1b[32;57;32;1;8;1_","\x1b[32;57;32;0;8;1_"]); });
  it("suppresses repeat", () => { const f=setup(); f.enableMode(); f.emit("keydown"); f.emit("keydown",{repeat:true}); f.emit("keydown"); expect(f.writes).toHaveLength(1); });
  it("does not capture AltGr, Shift, Meta, normal keys", () => { const f=setup(); f.enableMode(); for(const x of [{altKey:true},{shiftKey:true},{metaKey:true},{ctrlKey:false},{key:"c",code:"KeyC"}]) expect(f.emit("keydown",x).defaultPrevented).toBe(false); expect(f.writes).toEqual([]); });
  it("isolates two PTYs", () => { const a=setup(),b=setup(); a.enableMode(); b.enableMode(); b.emit("keydown"); expect(a.writes).toEqual([]); expect(b.writes).toHaveLength(1); });
  it("rejects unfocused textarea", () => { const f=setup(); f.enableMode(); f.textarea.ownerDocument.activeElement={}; f.emit("keydown"); expect(f.writes).toEqual([]); });
  it("honors live disable", () => { const f=setup(); f.enableMode(); f.disable(); f.emit("keydown"); expect(f.writes).toEqual([]); });
  it("honors DECRST", () => { const f=setup(); f.enableMode(); f.callbacks.get("l")!([9001]); f.emit("keydown"); expect(f.writes).toEqual([]); });
  it("passes compound modes to xterm", () => { const f=setup(); expect(f.callbacks.get("h")!([25,9001])).toBe(false); f.emit("keydown"); expect(f.writes).toHaveLength(1); });
  it("releases when Control is released first", () => { const f=setup(); f.enableMode(); f.emit("keydown"); f.emit("keyup",{ctrlKey:false}); expect(f.writes).toHaveLength(2); });
  it("resets held state on blur without synthesizing release", () => { const f=setup(); f.enableMode(); f.emit("keydown"); f.textarea.dispatchEvent(new Event("blur")); f.emit("keydown"); expect(f.writes).toHaveLength(2); });
  it("disposes all listeners and parsers", () => { const f=setup(); f.enableMode(); f.adapter.dispose(); f.emit("keydown"); expect(f.writes).toEqual([]); expect(f.disposed()).toBe(3); });
  it("answers DECRQM", () => { const f=setup(); f.enableMode(); f.callbacks.get("p")!([9001]); expect(f.writes).toEqual(["\x1b[?9001;1$y"]); });
});
