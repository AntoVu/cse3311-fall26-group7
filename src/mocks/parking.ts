export type ParkingLotStatus = 'available' | 'scattered' | 'almostFull' | 'notAllowed';

export type ParkingLot = {
  id: string;
  name: string;
  status: ParkingLotStatus;
  description?: string;
};

export const MOCK_CURRENT_PERMIT = 'Student Commuter (East)';

// Matches the Parking wireframe's example content so screenshots/demos line up.
export const MOCK_PARKING_LOTS: ParkingLot[] = [
  {
    id: 'lot-36',
    name: 'Lot 36',
    status: 'almostFull',
  },
  {
    id: 'lot-36-upgrade',
    name: 'Lot 36 Upgrade',
    status: 'notAllowed',
    description: 'Not included with your current permit.',
  },
  {
    id: 'north-garage',
    name: 'North Garage',
    status: 'scattered',
  },
  {
    id: 'middle-garage',
    name: 'Middle Garage',
    status: 'scattered',
    description: 'Majority of parking spaces are taken but a few can be found scattered.',
  },
];

export const MOCK_RECOMMENDED_LOT_ID = 'middle-garage';
export const MOCK_FIRST_CLASS_LABEL = 'NH 228';
export const MOCK_DISTANCE_TO_FIRST_CLASS_MILES = 0.6;
export const MOCK_WALK_MINUTES_TO_FIRST_CLASS = 12;
