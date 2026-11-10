import { create } from "zustand";

export type FlowRole = "passenger" | "driver";

type SessionState = {
  phone: string;
  verified: boolean;
  adult: boolean;
  role: FlowRole;
  institution: string;
  pickup: string;
  campus: string;
  tripStatus: "idle" | "matched" | "held" | "confirmed" | "active" | "complete";
  lastSeenAt: string | null;
  quotePaise: number;
  setPhone: (phone: string) => void;
  verify: () => void;
  attestAdult: () => void;
  setRole: (role: FlowRole) => void;
  setCommute: (pickup: string, campus: string) => void;
  setTripStatus: (tripStatus: SessionState["tripStatus"]) => void;
};

export const useSession = create<SessionState>((set) => ({
  phone: "",
  verified: false,
  adult: false,
  role: "passenger",
  institution: "Pilot Institute of Technology Pune",
  pickup: "Baner road",
  campus: "Gate 3",
  tripStatus: "idle",
  lastSeenAt: null,
  quotePaise: 3333,
  setPhone: (phone) => set({ phone }),
  verify: () => set({ verified: true }),
  attestAdult: () => set({ adult: true }),
  setRole: (role) => set({ role }),
  setCommute: (pickup, campus) => set({ pickup, campus }),
  setTripStatus: (tripStatus) =>
    set({
      tripStatus,
      lastSeenAt: tripStatus === "active" ? new Date().toISOString() : null,
    }),
}));
