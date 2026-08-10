"use client";

import { createContext, useContext } from "react";

export interface ChurchContextValue {
  church: any;
  currentUser: any;
  isMember: boolean;
  role: string | null;
  pendingCount: number;
  setPendingCount: React.Dispatch<React.SetStateAction<number>>;
  refreshChurchData: () => Promise<void>;
}

export const ChurchContext = createContext<ChurchContextValue>({
  church: null,
  currentUser: null,
  isMember: false,
  role: null,
  pendingCount: 0,
  setPendingCount: () => {},
  refreshChurchData: async () => {},
});

export function useChurch() {
  return useContext(ChurchContext);
}
