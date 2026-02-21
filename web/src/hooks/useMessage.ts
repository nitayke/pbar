import { useCallback, useRef, useState } from "react";

export function useMessage() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = useCallback((text: string, autoDismissMs?: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(text);
    if (autoDismissMs) {
      timerRef.current = setTimeout(() => setMessage(null), autoDismissMs);
    }
  }, []);

  const clearMessage = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(null);
  }, []);

  return { message, showMessage, clearMessage };
}
