"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useProctoring(attemptId: string, active: boolean) {
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const supabaseRef = useRef(createClient());

  function log(eventType: string, meta?: Record<string, unknown>) {
    supabaseRef.current
      .rpc("log_proctoring_event", {
        p_attempt_id: attemptId,
        p_event_type: eventType,
        p_meta: meta ?? null,
      })
      .then(() => {});
  }

  useEffect(() => {
    if (!active) return;

    function onVisibility() {
      if (document.hidden) {
        setTabSwitchCount((c) => c + 1);
        log("tab_hidden");
      }
    }
    function onBlur() {
      log("window_blur");
    }
    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
    }
    function onCopy(e: ClipboardEvent) {
      e.preventDefault();
      log("copy_attempt");
    }
    function onPaste(e: ClipboardEvent) {
      e.preventDefault();
      log("paste_attempt");
    }
    function onFullscreenChange() {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) {
        setFullscreenExits((c) => c + 1);
        log("fullscreen_exit");
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, attemptId]);

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // ignore — some browsers/devices don't support it
    }
  }

  return { tabSwitchCount, fullscreenExits, isFullscreen, enterFullscreen, log };
}
