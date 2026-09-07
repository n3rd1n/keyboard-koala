import { useEffect, useRef, useState } from "react";

/**
 * Search field for a view that is opened by a keystroke. Focusing is deferred to
 * a later task, so the activating key (e.g. pressing "a" to enter the
 * app-launcher) still resolves against the previous view and cannot insert
 * itself into the input.
 */
export function useActivationSafeSearch(focusToken: number, extraResetKey?: unknown) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery("");

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [focusToken, extraResetKey]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  return {
    query,
    setQuery,
    inputRef,
    handleChange,
  };
}
