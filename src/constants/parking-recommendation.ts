import {
    getParkingPermission,
    type ParkingPermit,
} from '@/constants/parking-permits';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import type { CampusLot } from '@/types/map';


type Coordinate = {
    lat: number;
    lng: number;
};

export function getDistance(
    first: Coordinate,
    second: Coordinate
): number {
    const earthRadiusMiles = 3958.8;

    const toRadians = (degrees: number) =>
        degrees * (Math.PI / 180);

    const lat1 = toRadians(first.lat);
    const lat2 = toRadians(second.lat);
    const latDifference = toRadians(second.lat - first.lat);
    const lngDifference = toRadians(second.lng - first.lng);

    const a =
        Math.sin(latDifference / 2) ** 2 +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(lngDifference / 2) ** 2;

    const c = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );

    return earthRadiusMiles * c;
}

export function getEstimatedWalkTime(distanceMiles: number): number {
    const walkingSpeedMph = 3;
    const walkingTimeHours = distanceMiles / walkingSpeedMph;

    return Math.max(1, Math.round(walkingTimeHours * 60));
}

export function getRecommendedLot(
    permit: ParkingPermit,
    destination: Coordinate
): CampusLot | null {
    const allowedLots = CAMPUS_LOTS.filter(
        (lot) => getParkingPermission(permit, lot.id) === 'allowed'
    );

    if (allowedLots.length === 0) {
        return null;
    }

    return allowedLots.reduce((closest, lot) => {
        const closestDistance = getDistance(
            closest.coordinate,
            destination
        );

        const lotDistance = getDistance(
            lot.coordinate,
            destination
        );

        return lotDistance < closestDistance ? lot : closest;
    });
}