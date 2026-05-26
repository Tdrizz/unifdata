"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getIndustryProfile } from "@/lib/industry-profiles";
import type { IndustryProfile } from "@/lib/industry-profiles";

const ProfileContext = createContext<IndustryProfile>(getIndustryProfile("general"));

export function ProfileProvider({
  businessSector,
  children,
}: {
  businessSector?: string | null;
  children: ReactNode;
}) {
  const profile = getIndustryProfile(businessSector);
  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}

export function useProfile(): IndustryProfile {
  return useContext(ProfileContext);
}
