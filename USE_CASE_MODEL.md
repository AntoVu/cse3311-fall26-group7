# Use Case Model

### High Level Use Case List
- **UC-01:** Select Parking Permit
- **UC-02:** Calculate Optimal Path
- **UC-03:** Set Starting Point
- **UC-04:** Toggle Traffic Avoidance
- **UC-05:** Navigate Indoor Route

---

## Detailed Use Case Analysis
### UC-02: Calculate Optimal Path
- **Actor:** User (student)
- **Description:** The system processes the user's starting point and destination to make an optimized route across campus and inside of buildings.
- **Preconditions:** System has already loaded the campus map graph and the user has inputted a valid starting point as well as destination.
- **Postconditions:** System has determined route instructions and shows a path to follow on the map view and the system provides the total distance to be traveled and ETA.
- **Scenario:**
  1. User entres the destination and room number
  2. User enters the starting point
  3. User starts the route calculation
  4. System finds the best path for outdoor traversal and indoor connections
  5. System checks the time of day to see if its a high foot traffic time
  6. System calculates the shortest path using a path finding algorithm like Dijkstra
  7. System gives directions back to the user in text form
  8. System shows the visual path to take on the map as well as ETA
- **Error Flows:**
    - User enters invalid building or room
        1. System detects unrecognized input
        2. System displays error message
        3. System prompts user to retry
    - High foot traffic avoidance is detected
        1. System alerts user of high foot traffic on path
        2. System asks user if they want to reroute if the toggle is not already on
        3. System reroutes to through less crowded pathways
        4. System warns the user if less crowded path actually adds more time