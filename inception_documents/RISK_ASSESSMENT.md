# Risk Assessment

> **Superseded in part (noted 2026-09-23).** This is the inception-phase table. Changes since:
> **R-07 (switching map API) happened** — Google Maps was dropped for a custom SVG map in Iteration 1.
> The Iteration 1 deliverable added **R-08** (indoor plans for UTA buildings, exposure 12.0, the highest
> open risk) and **R-09** (hand-traced map drifting from the real campus, exposure 3.2).
> **R-09 is now retired:** Iteration 1.5 replaced the hand-traced map with OpenStreetMap geometry,
> which is georeferenced and re-importable. This file is left as written so the inception record stays intact.

### Risk Table ordered by highest Risk Exposure

| Risk ID | Risk Description | Category | Probability | Impact (hours) | Risk Exposure | Mitigation |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Remodel or demolition of a building | External Data |50% | 8 | 4.0 | Focus indoor mapping to more established buildings and be ready to map redesigned buildings |
| R-02 | Construction of new building | External Data |50% | 5 | 2.5 | Have someone ready to map out the newly constructed building |
| R-03 | Cross platform issues (iOS/Android) | Technical |30% | 7 | 2.1 | Use a development framework that unifies cross platform development |
| R-04 | Not able to map certain locations | Data |70% | 3 | 2.1 | Implement a fallback plan like unsupported location blocks |
| R-05 | Project redesign | Technical |10% | 20 | 2.0 | Maintain updated documentation and plans as well as fallbacks if things go South to avoid an entire project redesign |
| R-06 | Loss of a team member | Team |20% | 8 | 1.6 | Beg team members to not drop out |
| R-07 | Need to switch API | Technical |10% | 15 | 1.5 | Create our own modeled UTA map or seek cheap alternative map data |