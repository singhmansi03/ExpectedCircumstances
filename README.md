Extraordinary Circumstances

HackPrinceton Fall 2026

Let's say you wanted to go from point A to point B in either the quickest or cheapest way possible. It seems that there's an airport just 100 miles away that will save you 200 dollars, but there's another flight 200 miles away that will save you even more. Maybe you don't want to travel all those 200 miles, or maybe you don't have a vehicle or a clue of how to get there. Have no fear, for as the FAA said, extraordinary circumstances are here! You can find flights, trains, buses, or the quickest route to your destination all on one screen.

We built this because we lost a teammate to the great ground stop of '26: he couldn't get here, and we scrambled to find the fastest way to get him to Princeton. No site had what we needed. So we built one.

What it does
Multimodal search: compares flying from your home airport against driving, bus, train or rideshare to a nearby alternate airport and flying from there, priced as one complete journey.
Urgent mode: after a cancellation, searches today and tomorrow, removes flights you can't physically reach in time (ground time + check-in buffer), and ranks by earliest arrival.
Travel recovery agent: describe what went wrong in plain English ("my DSM→DEL flight was cancelled, I need to be in Delhi by Tuesday 11pm, budget $1,800, I can drive or take a bus"). A LangChain Deep Agent plans the recovery, sends subagents to scout airports and search routes, writes its work to files, and asks you to approve the plan. Push back ("I can't do a 10-hour bus") and it re-plans.
Honest numbers: every price and time comes from our search engine, never from the AI. Each total is labeled quoted, estimated or unknown; unknown fares are never treated as $0; budgets and deadlines are enforced in code.
How the agent works
Browser (Next.js)  →  /api/agent  →  langgraph dev (Python Deep Agent, Gemini)
                                         ├─ airport-scout subagent → /api/nearby  → /candidates.md
                                         ├─ route-analyst subagent → /api/search  → /searches/*.md
                                         └─ main agent: plan (todos) → compare → /itinerary.md → approval

Built on the HackPrinceton Intro to Deep Agents starter:

Planning: write_todos, shown live in the UI
Subagents: airport-scout and route-analyst
Filesystem: candidates, raw searches and the final itinerary as files, viewable in the UI
Human-in-the-loop: finalize_itinerary pauses for Approve / Reject; rejecting with a reason triggers a re-plan

The TypeScript side (lib/) owns all travel data and math: SerpApi Google Flights, Google Maps directions, connection buffers, budget checks and ranking. The agent only decides what to search and explains the trade-offs.

Data: live vs. demo
Mode	Flights & ground	Cost
Demo (default)	Fictional sample fares ("Illustrative Air", "Sample Airways")	Free
Live	SerpApi Google Flights + Google Maps directions, cached in .cache/	SerpApi credits

Driving and rideshare costs are always estimates. Transit fares are shown only when the provider returns one. Live flight status is not verified.

Run it locally

You need Node.js and uv (Python package manager).

1. Keys

.env.local in the project root:

SERPAPI_KEY=your-serpapi-key
GEMINI_API_KEY=your-gemini-key

agent/.env (copy agent/.env.example):

GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-3.5-flash
APP_URL=http://localhost:3000
USE_LIVE_DATA=0

2. Two terminals

bash
# terminal 1: website on http://localhost:3000
npm install
npm run dev

# terminal 2: agent server on http://127.0.0.1:2024
cd agent
uv sync
uv run langgraph dev
Stack

Next.js 16, React 19, TypeScript, Tailwind · LangChain Deep Agents, LangGraph · Google Gemini · SerpApi (Google Flights, Google Maps)

Limitations and next steps
Ground schedules aren't time-matched to the flight date yet; connections are labeled "verify".
Round-trip fares are search offers; the return leg isn't priced separately.
Next: a maximum ground-travel time, live flight status, and booking handoff.