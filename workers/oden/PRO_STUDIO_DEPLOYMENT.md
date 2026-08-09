# Oden Pro Studio — Deployment Plan

What it would take to ship the product the demo portrays. One line per project.
Estimates are for **one engineer**, full-time, building production-grade (not a demo).

**Personas:** `DE` Data Eng · `BE` Backend Eng · `ML` ML Eng · `FE` Frontend Eng · `PLAT` Platform/DevOps · `PM/Design` Product+Design

---

## 🟢 CORE — the golden path (build these first, in order)

> Data integrated → labelled/augmented by detectors → run Bulk Historical Analysis → publish to an App.
> Nothing else matters until this works end to end.

| # | Project | What it delivers | Persona | Est. |
|---|---------|------------------|---------|------|
| C1 | **Data Integration & Ingestion** | Connect time-series sources, stream tags into storage with SKU/state/line metadata | DE | 6 wks |
| C2 | **Tag Mapping & Data Model** | Normalize tags, operating-state labels, product/line dimensions; the schema everything reads | DE + BE | 3 wks |
| C3 | **Detector Engine (core)** | Run detectors over streaming + historical data, emit labelled events with precision/confidence | BE + ML | 6 wks |
| C4 | **Detector Builder UI** | Configure a detector: pick metric, set threshold, see historical stats, name it, set severity | FE | 4 wks |
| C5 | **Bulk Historical Analysis** | Filter by state/date/product, compute the clean-data band, surface results | BE + ML | 5 wks |
| C6 | **Historical Analysis UI** | The time-series filtering screen (exclusions, date ranges, band visualization) | FE | 4 wks |
| C7 | **Apps + Component Library** | Create an App, drag/drop components (trend, metric tile, alert feed, detector, table) | FE + BE | 5 wks |
| C8 | **Publish Pipeline** | Turn an analysis into a live, role-targeted App component (Operator / PE / Dashboard) | BE | 3 wks |
| C9 | **Platform Foundation** | Auth, tenancy, deploy/CI, storage, observability — the ground everything stands on | PLAT | 4 wks |

**Core subtotal: ~40 engineer-weeks (~9–10 months for one engineer).**

---

## 🟡 NEXT — rounds out the core experience

| # | Project | What it delivers | Persona | Est. |
|---|---------|------------------|---------|------|
| N1 | **Operator / Active View** | Live monitoring dashboard: current values, detector status, alerts, multi-tab workspace | FE + BE | 4 wks |
| N2 | **Alerts & Severity** | Log/Alert/Escalate/Critical, acknowledge/dismiss, recommendation text | BE + FE | 3 wks |
| N3 | **Workflow Engine** | If detector fires + conditions → post alert + write to DB | BE | 4 wks |
| N4 | **Workflow Destinations** | Push alerts to Oden App, Ignition, Lighthouse, Slack, Email | BE | 3 wks |
| N5 | **Analyses / Projects Hub** | Directory of all analyses with objective, hypothesis, result, status | FE + BE | 3 wks |
| N6 | **Operator Feedback Loop** | Confirm/label good-bad runs; write labelled intervals back as training data | BE + ML | 3 wks |

**Next subtotal: ~20 engineer-weeks.**

---

## 🟠 ANALYSES — additional analysis types (priority-sorted)

| # | Project | What it delivers | Persona | Est. |
|---|---------|------------------|---------|------|
| A1 | **Explore (time-series viewer)** | Full-screen interactive series: brush, zoom, annotate, tag regions | FE | 4 wks |
| A2 | **Track a Pattern** | Model a known signature or unsupervised pattern search | ML + BE | 5 wks |
| A3 | **Bootstrap Detector** | Label candidate matches, review precision, deploy at ≥80% | ML + FE | 4 wks |
| A4 | **Detect a Signal** | Spike/dip, drift, distribution shift, noise, stuck/saturated, setpoint deviation | ML | 5 wks |
| A5 | **Stable-Period Analysis** | Aggregate over clean runs, compare product groups, find setpoints | ML | 3 wks |

**Analyses subtotal: ~21 engineer-weeks.**

---

## 🔴 FORGE — conversational AI layer (highest effort, do last)

| # | Project | What it delivers | Persona | Est. |
|---|---------|------------------|---------|------|
| F1 | **Forge Chat & Orchestration** | NL interface that plans analyses, calls tools, returns methodology + results | ML + BE | 8 wks |
| F2 | **Agentic RCA** | Scan events, correlate signals, rank driver families by precision/lift, recommend detectors | ML | 6 wks |
| F3 | **Forge Insight Components** | Pin a Forge conversation/result into an App | FE + BE | 2 wks |
| F4 | **Forge Recommendations** | "Forge recommends" → suggest SPC band / bootstrap detector inline | ML | 3 wks |

**Forge subtotal: ~19 engineer-weeks.**

---

## Rollup

| Tier | Scope | Est. |
|------|-------|------|
| 🟢 Core | Integrate → label → bulk analyze → publish | ~40 wks |
| 🟡 Next | Operator view, alerts, workflows, hub | ~20 wks |
| 🟠 Analyses | Explore + other analysis types | ~21 wks |
| 🔴 Forge | Conversational AI + agentic RCA | ~19 wks |
| | **Total (one engineer)** | **~100 wks (~2 yrs)** |

> Reality check: this is a team product. One engineer's ~2-year number is the honest single-threaded
> cost — split Core across DE/BE/ML/FE in parallel and the golden path lands in roughly a quarter.
