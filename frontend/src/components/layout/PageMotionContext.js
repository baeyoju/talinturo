import { createContext } from "react";

// true when animations should be skipped (OS setting or in-app "Reduce motion")
export const PageMotionContext = createContext(false);
