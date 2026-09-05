# Inception Delivery Checklist
## 1. Submission
 - [x] Set up GitHub Repo
 - [x] Initial commit with Vision Statement (`README.md`)
 - [x] Give access to group members
 - [ ] Give access to professor and TA
 - [ ] Include mandatory CC Email Reviewer warning block on Front Page
 - [ ] Emailed written deliverable PDF and slides to Review Team
   - [ ] Email Subject line starts with: `[CSE 3311 submission]`
   - [ ] Professor and TA added to CC line

---

## 2. Presentation Guidelines
 - [ ] Sans-serif fonts (at least 20pt-24pt)
 - [ ] Does not use high contrast coloring
 - [ ] Has visible slide numbers on each page
 - [ ] No "Agenda" or "Table of Contents"
 - [ ] Starts with sketches, paper prototypes, and pitch
 - [ ] One topic per slide
 - [ ] Slide title is summary sentence of key takeaways
 - [ ] Text is brief bullet points (no full paragraphs)
 - [ ] All assets, images, and tools cited
 - [ ] 8 minute delivery cap followed by 7 minute Q&A

---

## 3. Design Document

### Section 1: Main Info
 - [x] Project Name: **Mavigator**
 - [ ] Team Name & Member Split Roles Table
 - [x] GitHub Repository URL
 - [x] Evaluated Commit Hash
 - [ ] Mandatory CC Email Reviewer Warning Notice

### Section 2: Problem Context (Member 1)
 - [ ] Domain overview and campus navigation pain points
 - [ ] Shortcomings of current solutions (Google Maps, static UTA PDF map)
 - [ ] **Validation Evidence**: Documented findings from 3–5 UTA student interviews

### Section 3: Goals & Non-Goals (Member 1)
 - [ ] **Goals**: List requirement/impact pairings
  - Multi-floor / indoor room-to-room pathing
  - Parking spot optimization based on class schedule
  - Rerouting around high foot-traffic peak hours
 - [ ] **Non-Goals**: Explicit exclusions
  - Off campus navigation
  - Real time crowd monitoring
  - Commercial monetization

### Section 4: Target Customers & Users (Member 2)
 - [ ] Precise user demographics and student personas
 - [ ] Plan for active, weekly access to representative users for prototype feedback

### Section 5: Proposed Solution & Features
 - [ ] **High-Level Overview** (Member 1): Solution summary, tech stack choice, and key advantages
 - [ ] **Features & Specifications** (Member 4): Detail room-to-room routing, parking optimization, and traffic rerouting
 - [ ] **Agile User Stories** (Member 4): User stories with explicit acceptance criteria

### Section 6: Use-Case Model (Member 4)
 - [ ] High-level use case list using strictly **verb-noun** phrases (e.g. *Calculate Optimal Path*)
 - [ ] Detailed use-case analysis covering at least 10% of total use cases

### Section 7: Competitor Analysis & Uniqueness (Member 3)
 - [ ] In-depth breakdown of Google Maps and static UTA PDF map
 - [ ] 2D positioning positioning grid/map showing unique advantages

### Section 8: Technical Design (Member 3)
 - [ ] High-level system architecture block diagram
 - [ ] Major request paths and data flow
 - [ ] Object-Oriented data models (TypeScript interfaces/classes for nodes, edges, routes, and coordinates)

### Section 9: Alternatives Considered (Member 3)
 - [ ] Rapid paper prototypes vs high-fidelity Figma mockups
 - [ ] Custom routing engine vs standard Google Maps API

### Section 10: Quantitative Risk Assessment (Member 4)
 - [ ] Ranked risk exposure table sorted by $RE = p \times E$ (highest exposure first)
  - Data availability (indoor building maps)
  - Schedule/team dependency risks
 - [ ] Actionable mitigation strategies for each identified risk

### Section 11: Development Plan & Timeline (Member 4)
 - [ ] Integrated risk-based schedule for Iteration 1
 - [ ] Definition of first functional vertical slice (e.g. Nedderman Hall indoor routing)
 - [ ] Key project execution milestones

### Section 12: Open Questions & Parties Involved (All Members)
 - [ ] Current unresolved questions (e.g., floor plan data acquisition, parking lot occupancy)
 - [ ] Final team responsibility

### Section 13: Appendix & References (All Members)
 - [ ] Supplemental links and paper prototype diagrams
 - [ ] Citations for all resources, frameworks, and methodologies