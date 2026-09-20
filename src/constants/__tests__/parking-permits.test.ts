import {
  getParkingPermission,
  NO_PERMIT,
  PARKING_LOT_IDS,
  PARKING_PERMIT_CHOICES,
  PARKING_PERMITS,
  permitFromChoice,
} from '@/constants/parking-permits';

describe('parking permit choices', () => {
  it('offers None first, then every real permit', () => {
    expect(PARKING_PERMIT_CHOICES).toEqual([NO_PERMIT, ...PARKING_PERMITS]);
  });

  it('maps None to no permit and passes real permits through', () => {
    expect(permitFromChoice(NO_PERMIT)).toBeNull();
    expect(permitFromChoice('East Commuter')).toBe('East Commuter');
  });

  it('marks every lot restricted when the user has no permit', () => {
    for (const lotId of Object.values(PARKING_LOT_IDS)) {
      expect(getParkingPermission(permitFromChoice(NO_PERMIT), lotId)).toBe('restricted');
    }
  });
});
