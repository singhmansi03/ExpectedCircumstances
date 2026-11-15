"""Extraordinary Circumstances travel-recovery deep agent.

Built on the HackPrinceton "Intro to Deep Agents" starter (agent.py + langgraph.json,
served with `langgraph dev`, driven from the UI through the LangGraph SDK as in Module 2).

Division of labor:
  - The Next.js app (localhost:3000) owns ALL travel data and math: SerpApi fares,
    ground routes, connection buffers, budget checks, ranking.
  - This agent decides WHAT to search, compares the results, re-plans when the
    traveler pushes back, and writes its work to files. It never invents prices
    or times: every number it reports comes back from a tool.

Deep Agents features used:
  - write_todos planning (TodoListMiddleware)
  - subagents via task(): airport-scout and route-analyst
  - virtual filesystem: /candidates.md, /searches/*.md, /itinerary.md
  - human-in-the-loop: finalize_itinerary pauses for the traveler's approval
"""

import json
import os
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
from deepagents import create_deep_agent
from langchain.agents.middleware import TodoListMiddleware
from langchain_core.tools import tool

from utils.models import model

APP_URL = os.environ.get("APP_URL", "http://localhost:3000")
# Demo data by default so an agent loop can't burn SerpApi credits.
# Set USE_LIVE_DATA=1 in agent/.env to search real fares (cached by the app).
USE_LIVE_DATA = os.environ.get("USE_LIVE_DATA", "0") == "1"


def _fmt_epoch(epoch_ms, tz_name):
    if epoch_ms is None:
        return None
    tz = ZoneInfo(tz_name) if tz_name else ZoneInfo("UTC")
    return datetime.fromtimestamp(epoch_ms / 1000, tz).strftime("%Y-%m-%d %H:%M %Z")


@tool(parse_docstring=True)
def nearby_airports(origin: str, max_miles: int = 700) -> str:
    """List airports within a straight-line radius of the origin airport. Costs no API credits.

    Args:
        origin: IATA code or city of the traveler's starting airport, e.g. DSM.
        max_miles: Maximum straight-line distance in miles (100-1200).
    """
    try:
        r = httpx.get(f"{APP_URL}/api/nearby", params={"from": origin, "miles": max_miles}, timeout=15)
        return r.text
    except httpx.HTTPError as e:
        return f"ERROR: could not reach the app at {APP_URL}: {e}"


@tool(parse_docstring=True)
def search_journeys(
    origin: str,
    destination: str,
    departure_date: str = "",
    urgent: bool = False,
    budget_usd: float | None = None,
    alternate_airports: str = "",
    ground_modes: str = "drive,bus,train,rideshare",
    max_ground_miles: int = 700,
    arrive_by: str = "",
) -> str:
    """Search and rank complete journeys (ground leg + flight) with the app's deterministic engine.

    Fares, schedules, connection buffers and budget checks are computed by the app,
    not by you. Report numbers exactly as returned. Unknown costs stay unknown.

    Args:
        origin: Starting airport IATA code, e.g. DSM.
        destination: Destination airport IATA code, e.g. DEL. Itineraries must end here.
        departure_date: YYYY-MM-DD. Ignored when urgent is true (searches today and tomorrow).
        urgent: True for disrupted/emergency travel: ranks by earliest arrival.
        budget_usd: Maximum total trip cost in USD, or null for no limit.
        alternate_airports: Comma-separated IATA codes to include as alternate departure airports, e.g. "ORD,MCI".
        ground_modes: Comma-separated allowed ground modes from drive,bus,train,rideshare.
        max_ground_miles: Radius for automatically chosen alternate airports.
        arrive_by: Optional deadline "YYYY-MM-DD HH:MM" in the destination's local time. Journeys arriving later are removed.
    """
    body = {
        "origin": origin,
        "destination": destination,
        "departureDate": departure_date,
        "mode": "emergency" if urgent else "standard",
        "priority": "fastest" if urgent else "cheapest",
        "budgetUSD": budget_usd,
        "extraAirports": alternate_airports,
        "preferredModes": [m.strip() for m in ground_modes.split(",") if m.strip()],
        "maxGroundMiles": max_ground_miles,
        "flexibleDays": 0,
        "demo": not USE_LIVE_DATA,
    }
    try:
        r = httpx.post(f"{APP_URL}/api/search", json=body, timeout=120)
        data = r.json()
    except (httpx.HTTPError, ValueError) as e:
        return f"ERROR: search failed: {e}"
    if r.status_code != 200:
        return f"ERROR: {data.get('error', r.status_code)}"

    dest_tz = (data.get("destination") or {}).get("timeZone")
    deadline_ms = None
    if arrive_by:
        try:
            local = datetime.strptime(arrive_by, "%Y-%m-%d %H:%M").replace(tzinfo=ZoneInfo(dest_tz or "UTC"))
            deadline_ms = local.timestamp() * 1000
        except ValueError:
            return "ERROR: arrive_by must look like 2026-11-16 21:00"

    rows, dropped = [], 0
    for j in data.get("journeys", []):
        if deadline_ms is not None and (j.get("arrivalEpoch") is None or j["arrivalEpoch"] > deadline_ms):
            dropped += 1
            continue
        flight, ground = j.get("flight") or {}, j.get("ground") or {}
        rows.append({
            "via_airport": j.get("airport"),
            "kind": j.get("kind"),
            "ground": f"{ground.get('mode')} {ground.get('durationMinutes')} min, "
                      f"${ground.get('costUSD')} ({ground.get('costType')})" if ground else "none",
            "flight": f"{flight.get('airline')} {flight.get('from')}->{flight.get('to')} departs "
                      f"{flight.get('departureLocal')}, {flight.get('stops')} stops, ${flight.get('priceUSD')}" if flight else "none",
            "total_usd": j.get("estimatedTotalUSD"),
            "cost_type": j.get("costType"),
            "savings_vs_original_usd": j.get("savingsUSD"),
            "arrives": _fmt_epoch(j.get("arrivalEpoch"), dest_tz),
            "travel_minutes": j.get("outboundTravelMinutes"),
            "connection": j.get("connectionStatus"),
        })
        if len(rows) == 6:
            break

    return json.dumps({
        "data_source": data.get("source"),  # "demo" = fictional prices, "live" = SerpApi
        "searched_airports": data.get("searchedAirports"),
        "baseline_flight_from_origin_usd": data.get("baselineUSD"),
        "dropped_for_missing_deadline": dropped,
        "top_journeys": rows,
        "warnings": data.get("warnings", [])[:4],
    }, indent=1)


@tool(parse_docstring=True)
def finalize_itinerary(summary: str) -> str:
    """Present the recommended itinerary to the traveler for approval. Call once, at the end.

    Args:
        summary: A short plain-text summary of the chosen journey, its total cost, arrival time and risks.
    """
    return "Traveler approved the itinerary. Remind them to verify fares and connections before booking."


today = datetime.now().strftime("%Y-%m-%d")

airport_scout = {
    "name": "airport-scout",
    "description": "Finds candidate alternate departure airports near the origin. Give it the origin and a radius.",
    "system_prompt": f"""Today is {today}. You shortlist alternate departure airports.
Call nearby_airports once. Pick at most 4 airports that are realistic by ground (prefer under ~6 hours driving, ~350 miles)
and are larger hubs likely to have international connections. Write the shortlist with distances and a one-line reason
each to /candidates.md, then reply with the comma-separated codes.""",
    "tools": [nearby_airports],
}

route_analyst = {
    "name": "route-analyst",
    "description": "Runs one journey search for a given set of alternate airports and constraints and saves the results.",
    "system_prompt": f"""Today is {today}. You run journey searches.
Call search_journeys exactly once with the constraints you were given.
Save the returned JSON with a 2-line takeaway to /searches/<ORIGIN>-<DEST>-<label>.md.
Reply with the best 2 options, copying numbers exactly. Never invent prices or times.
If data_source is "demo", say the prices are fictional sample data.""",
    "tools": [search_journeys],
}

SYSTEM_PROMPT = f"""You are Extraordinary Circumstances, a travel-recovery agent. Today is {today}.
A traveler tells you where they need to go, often after a cancellation or delay, with a budget or deadline.

Process:
1. Plan with write_todos first and keep it updated.
2. Delegate to airport-scout to shortlist alternate departure airports.
3. Delegate to route-analyst with those airports and the traveler's constraints (urgent=true for disruptions,
   arrive_by for deadlines, ground_modes for what they can use). Run a second search only if the first leaves
   no option inside the budget or deadline.
4. Compare the options. Reject itineraries that end at a different airport than the destination
   or need extreme ground detours. A cheaper option with an unknown ground cost is NOT confirmed cheaper.
5. Write /itinerary.md: recommended journey, backup option, total cost with its cost type, arrival time,
   and what must be verified before booking.
6. Call finalize_itinerary with a short summary. The traveler approves or rejects it.

If the traveler pushes back (e.g. "I can't drive", "too expensive", "need to arrive earlier"),
update the todos and search again with the new constraint instead of arguing.
Every price and time you state must come from a tool result. Keep chat replies short."""

agent = create_deep_agent(
    model=model,
    tools=[nearby_airports, search_journeys, finalize_itinerary],
    subagents=[airport_scout, route_analyst],
    system_prompt=SYSTEM_PROMPT,
    middleware=[TodoListMiddleware()],
    interrupt_on={"finalize_itinerary": True},
)
