import { useEffect, useState } from "react";
import { USER_NAME_STORAGE_KEY } from "../lib/taskUtils";

export function useCurrentUser() {
  const [currentUserName, setCurrentUserName] = useState("");
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    const existing = window.localStorage.getItem(USER_NAME_STORAGE_KEY)?.trim();
    if (existing) {
      setCurrentUserName(existing);
      setNameInput(existing);
    }
  }, []);

  const saveUserName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    window.localStorage.setItem(USER_NAME_STORAGE_KEY, trimmed);
    setCurrentUserName(trimmed);
    return true;
  };

  return { currentUserName, nameInput, setNameInput, saveUserName };
}
