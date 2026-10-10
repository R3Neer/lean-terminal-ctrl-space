import type { Terminal, IDisposable } from "@xterm/xterm";

/** Narrow ConPTY adapter. Never sends CSI-u and never touches shell bindings. */
export function installWin32ControlSpace(
  terminal: Terminal,
  write: (data: string) => void,
  options: { enabled: () => boolean; diagnostics: () => boolean; sessionId: string },
): IDisposable {
  let mode = false;
  let held = false;
  let disposed = false;
  const textarea = terminal.textarea;
  const captureRoot = textarea?.parentElement ?? textarea;
  const capture = { capture: true };
  const log = (stage: string, extra: object = {}) => {
    if (options.diagnostics()) console.debug("[CtrlSpace]", { session: options.sessionId, stage, mode, ...extra });
  };
  const parsers = [true, false].map(enabled => terminal.parser.registerCsiHandler(
    { prefix: "?", final: enabled ? "h" : "l" },
    params => {
      if (!params.includes(9001)) return false;
      mode = enabled;
      if (!mode) held = false;
      log("negotiation", { enabled });
      // Let xterm process other modes in a compound DECSET/DECRST.
      return params.length === 1;
    },
  ));
  parsers.push(terminal.parser.registerCsiHandler({ prefix: "?", intermediates: "$", final: "p" }, params => {
    if (params.length !== 1 || params[0] !== 9001) return false;
    write(`\x1b[?9001;${mode ? 1 : 2}$y`);
    return true;
  }));
  const listener = (e: KeyboardEvent) => {
    if (disposed || !textarea || e.target !== textarea || textarea.ownerDocument.activeElement !== textarea) return;
    const space = e.code === "Space" || e.key === " ";
    if (!space) return;
    const chord = e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
    if (!chord && !(e.type === "keyup" && held)) return;
    log("capture", { type: e.type, repeat: e.repeat, enabled: options.enabled() });
    if (!options.enabled() || !mode) { held = false; return; }
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type === "keydown" && !held && !e.repeat) {
      // Physical space, scancode 57, Unicode SPACE, left CONTROL. ConPTY maps
      // this to a Win32 INPUT_RECORD; Crossterm then reads Char(' ')+CONTROL.
      held = true;
      write("\x1b[32;57;32;1;8;1_");
      log("pty-write", { event: "press", bytes: "1b5b33323b35373b33323b313b383b315f" });
    } else if (e.type === "keyup" && held) {
      held = false;
      write("\x1b[32;57;32;0;8;1_");
      log("pty-write", { event: "release", bytes: "1b5b33323b35373b33323b303b383b315f" });
    }
  };
  const blur = () => { held = false; };
  for (const type of ["keydown", "keyup", "keypress"]) captureRoot?.addEventListener(type, listener as EventListener, capture);
  textarea?.addEventListener("blur", blur);
  return { dispose: () => {
    if (disposed) return;
    disposed = true;
    for (const p of parsers) p.dispose();
    for (const type of ["keydown", "keyup", "keypress"]) captureRoot?.removeEventListener(type, listener as EventListener, capture);
    textarea?.removeEventListener("blur", blur);
    held = false;
  } };
}
