# Interviews

We asked 5 different people the following questions:
- **Q1:** Do you find it difficult to navigate UTA, especially when it's a new semester?
- **Q2:** What tools do you currently use to get around campus (Google Maps, UTA Map etc) and do you have any issues with them?
- **Q3:** If someone were to build a product that allowed you to input your class room numbers and it’ll show you the shortest past to get between classes as well as best parking spaces what would you want from the app?

---

### User 1: Tan Nguyen (Third-year Biology Major)
**A1:** Yes, although only when trying to find parking space.

**A2:** I mainly use Google Maps and the UTA campus map. I’ll also use the building and room information provided through the mymav website, but it doesn’t always make the best walking route or parking options.

**A3:** I would want the app to show the shortest path between classes and best parking spaces given the buildings I need to go to with an eta on when I will arrive.

---

### User 2: Andy Ta (Second-year Computer Science Major)
**A1:** I do not find it too difficult to navigate UTA (building wise), but I do find it hard to find certain rooms, especially if they are on a side of campus I've never been to.

**A2:** I mainly use Google Maps and the physical posted map of UTA. Google Maps can be outdated but I don't have too many issues with the UTA map.

**A3:** I would like there to be a feature that allows you to specify what type of parking permit you have (add some constraints), depict if there is a lot of physical trafifc/movement (kind of like how google maps has the red or orange lines), and a way for me to avoid certain areas/go towards more favorable areas.

---

### User 3: Daniel Aguilar (Fourth-year Physics Major)
**A1:** So `redacted word` hard. I lowk get lost all the time.

**A2:** I look up on uta map and loiter till i find them, yes ive gotten lost many times, never used google maps uta is a bit slow.

**A3:** That app would be tuff srs.

---

### User 4: Blaine Smith (Fourth-year Data Science Major)
**A1:** It's not the most difficult but I can definitely see where some confusion comes from.

**A2:** I use the UTA static map, but I can't count the times I have got lost in a building looking for a class, and sometimes, the static UTA map just couldn’t help me.

**A3:** As a senior I can imagine how helpful this would have been early on. Since I live on campus, I'd like it to support routing from dorms here.

---

### User 5: Steven Dau (Third-year Computer Science Major)
**A1:** It sucks `redacted word`

**A2:** Google Maps is helpful but once I find my building, the room numbering is confusing.

**A3:** Can I just enter my MavID and it takes my schedule automatically?

---

# Interview Results
- **Indoor Navigation:** A majority reported getting lost indoors or finding room numbering confusing.
- **Parking & Schedule:** Commuter students shared difficulties finding parking for their permit types.
- **Automation Demand:** Students showed a desire for automated schedule syncing.

---

# User Stories
## US-01: Permit Parking Optimization
- **User Story:** As a commuter student with a specific parking permit, I want there to be recommended parking locations near my classes so I don't waste time searching for a good parking space.
- **Aceptance Criteria:**
  - User can select their permit type (East/South/West Commuter, Reduced Rate, Lot Upgrade, Staff Parking)
  - System will account for high populated hours and recommend less likely to be filled alternatives as well as account for time of year
  - System will display a walking or biking ETA from the parking location to the user's first class

---

## US-02: Indoor Room Routing
- **User Story:** As a student going through the buildings on campus, I want there to be a floor-level step by step directions so I can find my specific room number without taking wrong turns.
- **Acceptance Criteria:**
  - System will accept multi-floor navigation as well as specific room numbers
  - Directions will specify where the stairs, elevators, and shortcuts are

---

## US-03: High Foot Traffic Rerouting
- **User Story:** As a student walking across campus during the most crowded hours, I want the app to recommend alternative routes that avoids major foot traffic.
- **Acceptance Criteria:**
  - System will display high foot traffic zones like the front of the library around noon
  - User can toggle a feature to avoid crowds to find a better path less traveled on

---

## US-04: On-Campus Residential Routeing
- **User Story:** As an on-campus resident, I want to be able to have my apartment as the starting point so I can route directly to my class from my apartment.
- **Acceptance Criteria:**
  - System will include all UTA residence halls and campus apartments as possible starting points
  - May even expand to nearby apartments technically off-campus