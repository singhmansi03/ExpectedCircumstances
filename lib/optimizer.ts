
export type CombinedRoute = {
  airport: string;
  flightPrice: number;
  flightDuration: number;
  groundPrice: number | null;
  groundDuration: number | null;
  groundFareKnown: boolean;
  connectionVerified: boolean;
};

export function compareRoutes(
  routes: CombinedRoute[],
  originalFlightPrice: number,
  budget: number
) {
  return routes
    .map((route) => {
      const totalCost =
        route.groundPrice === null
          ? null
          : route.flightPrice + route.groundPrice;

      const savings =
        totalCost === null
          ? null
          : originalFlightPrice - totalCost;

      const totalMinutes =
        route.groundDuration === null
          ? null
          : route.groundDuration + route.flightDuration;

      return {
        ...route,
        totalCost,
        savings,
        totalMinutes,
        withinBudget:
          totalCost !== null && totalCost <= budget,
        recommendable:
          totalCost !== null &&
          totalCost <= budget &&
          route.connectionVerified,
      };
    })
    .sort((a, b) => {
      // Unknown costs go last.
      if (a.totalCost === null) return 1;
      if (b.totalCost === null) return -1;

      return a.totalCost - b.totalCost;
    });
}
