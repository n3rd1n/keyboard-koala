import { useEffect, useRef, useState } from "react";

/**
 * Search field that ignores the keystroke which opened the view
 * (e.g. pressing "a" to enter app-launcher must not type "a" into the input).
 */
export function useActivationSafeSearch(focusToken: number, extraResetKey?: unknown) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const ignoreActivationRef = useRef(false);

  useEffect(() => {
    setQuery("");
    ignoreActivationRef.current = true;

    function focusInput() {
      inputRef.current?.focus();
    }

    // Focus after the activating key finishes so it cannot insert into the input.
    window.addEventListener("keyup", focusInput, { once: true });
    const fallback = window.setTimeout(focusInput, 0);

    return () => {
      window.removeEventListener("keyup", focusInput);
      window.clearTimeout(fallback);
    };
  }, [focusToken, extraResetKey]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (ignoreActivationRef.current) {
      ignoreActivationRef.current = false;
      setQuery("");
      return;
    }
    setQuery(event.target.value);
  }

  function absorbActivationKey(event: React.KeyboardEvent<HTMLInputElement>): boolean {
    if (
      ignoreActivationRef.current &&
      event.key.length === 1 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      ignoreActivationRef.current = false;
      return true;
    }
    return false;
  }

  return {
    query,
    setQuery,
    inputRef,
    handleChange,
    absorbActivationKey,
  };
}
