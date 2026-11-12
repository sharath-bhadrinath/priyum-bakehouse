import { useEffect } from "react";

/** Adds a class to <html> while the calling component is mounted. */
export function useDocumentClass(name: string) {
  useEffect(() => {
    document.documentElement.classList.add(name);
    return () => document.documentElement.classList.remove(name);
  }, [name]);
}
