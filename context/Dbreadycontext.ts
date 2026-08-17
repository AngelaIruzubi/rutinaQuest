import { createContext, useContext } from "react";

export const DBReadyContext = createContext(false);
export const useDBReady = () => useContext(DBReadyContext);
