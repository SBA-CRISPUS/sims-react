import { useContext } from "react";

import { AcademicContext } from "../context/AcademicContext";

export function useAcademicContext() {
  const ctx = useContext(AcademicContext);
  if (!ctx) {
    throw new Error(
      "useAcademicContext must be used within an AcademicContextProvider"
    );
  }
  return ctx;
}
