export type Priority = "cheapest" | "fastest";
export type SearchMode = "standard" | "emergency";
export type Disruption = "none" | "delayed" | "cancelled" | "missed_connection";
export type GroundMode = "drive" | "bus" | "train" | "transit" | "rideshare";
export type CostType = "quoted" | "estimated" | "unknown";

export interface Airport {
  code: string;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  timeZone: string | null;
}
export interface SearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  priority: Priority;
  mode: SearchMode;
  disruption: Disruption;
  originalFlightNumber?: string;
  startAddress?: string;
  budgetUSD: number | null;
  flexibleDays: 0 | 1;
  maxGroundMiles: number;
  preferredModes: GroundMode[];
  extraAirports: string[];
  demo: boolean;
}
export interface FlightOffer {
  id: string;
  from: string;
  to: string;
  airline: string;
  priceUSD: number;
  durationMinutes: number;
  departureLocal: string;
  arrivalLocal: string;
  departureEpoch: number | null;
  arrivalEpoch: number | null;
  stops: number;
  roundTrip: boolean;
  departureDate: string;
  source: "serpapi" | "demo";
}
export interface GroundLeg {
  mode: GroundMode;
  durationMinutes: number;
  distanceMiles: number | null;
  costUSD: number | null;
  costType: CostType;
  scheduleVerified: boolean;
  description: string;
  source: "serpapi" | "demo";
  url: string;
}
export interface Journey {
  id: string;
  airport: string;
  destination: string;
  kind: "direct-airport" | "alternate-airport" | "ground-only";
  flight: FlightOffer | null;
  ground: GroundLeg | null;
  estimatedTotalUSD: number | null;
  costType: CostType;
  savingsUSD: number | null;
  outboundTravelMinutes: number;
  arrivalEpoch: number | null;
  departAirportEpoch: number | null;
  withinBudget: boolean | null;
  connectionStatus: "plausible" | "unverified";
  issues: string[];
  searchUrl: string;
}
export interface AgentStep {
  name: string;
  status: "completed" | "partial" | "skipped";
  detail: string;
}
export interface SearchResponse {
  source: "demo" | "live";
  searchedAt: string;
  origin: Airport;
  destination: Airport;
  journeys: Journey[];
  baselineUSD: number | null;
  warnings: string[];
  agentSteps: AgentStep[];
  narrative: string | null;
  searchedAirports: string[];
}
