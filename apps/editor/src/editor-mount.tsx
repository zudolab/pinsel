import { useEffect, useRef } from "preact/hooks";
import { mountContentEditor, type ContentEditorHandle, type ContentEditorState, type MountContentEditorOptions } from "zudo-composer/content-editor";
import { localizeChrome } from "./localize";

// One `mountContentEditor` per (group, route, generation). Composer's preview
// option names a single route per mount and the directory lists every policy
// model, so changing either remounts with new options (upstream follow-up in
// docs/dependencies.md "Known Composer gaps").

export interface EditorMountProps {
  readonly options: MountContentEditorOptions;
  /** Changes force a fresh mount (new session, authoritative reload). */
  readonly mountKey: string;
  readonly onState: (state: ContentEditorState) => void;
  readonly handleRef: { current: ContentEditorHandle | null };
  readonly rootRef: { current: HTMLDivElement | null };
}

export function EditorMount({ options, mountKey, onState, handleRef, rootRef }: EditorMountProps) {
  const local = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = local.current;
    if (!root) return;
    rootRef.current = root;
    const stopLocalize = localizeChrome(root);
    const handle = mountContentEditor(root, options);
    handleRef.current = handle;
    // Exposed for the scripted browser checks only; nothing on the page reads it.
    Object.assign(window, { __pinselEditor: handle });
    const unsubscribe = handle.subscribe(onState);
    return () => {
      unsubscribe();
      stopLocalize();
      handle.dispose();
      if (handleRef.current === handle) handleRef.current = null;
    };
  }, [mountKey]);
  return <div class="pinsel-editor__mount" ref={local} data-mount={mountKey} />;
}
