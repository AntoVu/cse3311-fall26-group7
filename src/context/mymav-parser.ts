import { parseTimeString, type AddClassInput } from '@/context/schedule-context';

/**
 * Reads a class schedule pasted from MyMav (US-05): UTA's PeopleSoft "My Class Schedule", list
 * view or the phone layout, copied with select-all. Pure, so it is tested without React.
 *
 * What it looks for, wherever it sits on the page: a course line ("CSE 3311 - Title"), then each
 * meeting's days and times ("TuTh 11:00AM - 12:20PM", or "MWF"/"TR"), and the room after it on the
 * same row or on the next line ("NH 00109", "Nedderman Hall 100"). The room's building must be on
 * the map; anything that can't be placed (online, TBA, an unknown building) is listed with why,
 * never dropped silently.
 *
 * The newer week view lists each day instead ("Tuesday November 3", "11:00AM", "CSE 3330 Lecture",
 * "Room: NH  111", "Status: Enrolled"); see parseWeekView.
 */

type Building = { id: string; name: string; abbreviation?: string };

export type SkippedMeeting = { courseCode: string; reason: string };

const COURSE = /^\s*([A-Z]{2,5})\s+(\d{4}[A-Z]?)(?:-\d{3})?\s+-\s+(.+?)\s*$/;
const MEETING =
  /\b((?:Mo|Tu|We|Th|Fr|Sa|Su)+|[MTWRFSU]{1,6})\s+(\d{1,2}:\d{2})\s*([AP]M)\s*(?:-|to)\s*(\d{1,2}:\d{2})\s*([AP]M)/;
const COMPONENT = /\b(Lecture|Laboratory|Lab|Discussion|Recitation|Seminar|Studio|Clinical)\b/;
const NO_PLACE = /\b(TBA|ONLINE|INTERNET|ARR)\b/i;
const DAY_OF = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, U: 0, M: 1, T: 2, W: 3, R: 4, F: 5, S: 6 } as const;

function parseDays(text: string): number[] {
  const parts = /^(?:Mo|Tu|We|Th|Fr|Sa|Su)+$/.test(text) ? text.match(/../g)! : text.split('');
  return [...new Set(parts.map((part) => DAY_OF[part as keyof typeof DAY_OF]))].sort((a, b) => a - b);
}

/** PeopleSoft titles are often all caps: "OBJECT-ORIENTED SOFTWARE ENG" -> "Object-Oriented Software Eng". */
function titleCase(title: string): string {
  if (/[a-z]/.test(title)) return title;
  const minor = new Set(['a', 'an', 'and', 'for', 'in', 'of', 'on', 'the', 'to']);
  return title
    .toLowerCase()
    .split(' ')
    .map((word, i) =>
      /^(i|ii|iii|iv|v)$/.test(word)
        ? word.toUpperCase()
        : i > 0 && minor.has(word)
          ? word
          : word.replace(/(^|-)([a-z])/g, (_, dash: string, letter: string) => dash + letter.toUpperCase())
    )
    .join(' ');
}

const normalize = (text: string) =>
  text.toLowerCase().replace(/\bbldg\b/g, 'building').replace(/[^a-z0-9]/g, '');

/** "NH 00109" -> NH, "109". A room padded to five digits loses its leading zeros (kept to three). */
function placeRoom(
  text: string,
  buildings: Building[]
): { buildingId: string; roomNumber: string } | { unknown: string } | null {
  const match = text.trim().match(/^(.*?)[\s-]+([A-Z]?\d{2,5}[A-Z]?)$/i);
  if (!match || !match[1].trim()) return null;
  const wanted = normalize(match[1]);
  // A shortened name ("Engineering Research Bldg") counts when only one building starts with it.
  const prefixed = wanted.length >= 4 ? buildings.filter((b) => normalize(b.name).startsWith(wanted)) : [];
  const found =
    buildings.find((b) => b.abbreviation && normalize(b.abbreviation) === wanted) ??
    buildings.find((b) => normalize(b.name) === wanted) ??
    (prefixed.length === 1 ? prefixed[0] : undefined);
  if (!found) return { unknown: match[1].trim() };
  const roomNumber = /^\d{5}$/.test(match[2]) ? String(Number(match[2])).padStart(3, '0') : match[2].toUpperCase();
  return { buildingId: found.id, roomNumber };
}

const to12h = (time: string, period: string) => `${time.replace(/^0(\d)/, '$1')} ${period.toUpperCase()}`;

const WEEKDAY = /^\s*(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/i;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const START = /^\s*(\d{1,2}:\d{2})\s*([AP]M)\s*$/i;
const WEEK_COURSE = /^\s*([A-Z]{2,5})\s+(\d{4}[A-Z]?)\s+([A-Za-z]+)\s*$/;

/**
 * The week view lists no end time. UTA's Tuesday/Thursday classes run 80 minutes and the rest 50, so
 * that is the guess; the preview shows it, and the class can be edited after.
 */
function guessEnd(start: string, days: number[]): string {
  const end = parseTimeString(start) + (days.every((d) => d === 2 || d === 4) ? 80 : 50);
  const hours = Math.floor(end / 60) % 24;
  return `${hours % 12 || 12}:${String(end % 60).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** The week view: one class per course, start, component and room, across the days it shows up. */
function parseWeekView(lines: string[], buildings: Building[], skip: (code: string, reason: string) => void) {
  const found = new Map<string, AddClassInput>();
  let day: number | undefined;
  let meeting: { day: number; start: string; code?: string; kind?: string; room?: string; status?: string } | null = null;

  const flush = () => {
    const m = meeting;
    meeting = null;
    if (!m?.code) return;
    if (m.status && !/^enrolled$/i.test(m.status)) return skip(m.code, `Status is ${m.status}, not enrolled.`);
    if (!m.room || NO_PLACE.test(m.room)) return skip(m.code, 'No set meeting time or room (online or TBA).');
    const place = placeRoom(m.room, buildings);
    if (!place) return skip(m.code, 'No room listed for this meeting. Add it by hand.');
    if ('unknown' in place) return skip(m.code, `Building "${place.unknown}" is not on the map. Add this class by hand.`);
    const kind = m.kind === 'Laboratory' ? 'Lab' : m.kind!;
    const key = [m.code, kind, m.start, place.buildingId, place.roomNumber].join('|');
    const known = found.get(key);
    if (known) known.days = [...new Set([...known.days!, m.day])].sort((a, b) => a - b);
    else found.set(key, { courseCode: m.code, courseName: kind, ...place, days: [m.day], startTime: m.start, endTime: '' });
  };

  for (const line of lines) {
    const weekday = line.match(WEEKDAY);
    const start = line.match(START);
    const course = line.match(WEEK_COURSE);
    if (weekday) {
      flush();
      day = WEEKDAYS.indexOf(weekday[1].toLowerCase());
    } else if (start && day !== undefined) {
      flush();
      meeting = { day, start: to12h(start[1], start[2]) };
    } else if (meeting && course) {
      meeting.code = `${course[1]} ${course[2]}`;
      meeting.kind = course[3];
    } else if (meeting && /^\s*Room:/i.test(line)) {
      meeting.room = line.replace(/^\s*Room:/i, '').trim();
    } else if (meeting && /^\s*Status:/i.test(line)) {
      meeting.status = line.replace(/^\s*Status:/i, '').trim();
    }
  }
  flush();
  return [...found.values()].map((c) => ({ ...c, endTime: guessEnd(c.startTime, c.days!) }));
}

export function parseMyMavSchedule(
  text: string,
  buildings: Building[]
): { classes: AddClassInput[]; skipped: SkippedMeeting[] } {
  const lines = text.split(/\r?\n/);
  const classes: AddClassInput[] = [];
  const skipped: SkippedMeeting[] = [];
  const seen = new Set<string>();
  const skip = (courseCode: string, reason: string) => {
    if (!skipped.some((s) => s.courseCode === courseCode && s.reason === reason)) skipped.push({ courseCode, reason });
  };
  let course: { code: string; name: string } | null = null;
  let component: string | undefined;

  lines.forEach((line, i) => {
    const header = line.match(COURSE);
    if (header) {
      course = { code: `${header[1]} ${header[2]}`, name: titleCase(header[3]) };
      component = undefined;
      return;
    }
    if (!course) return;
    component = line.match(COMPONENT)?.[1] ?? component;
    const meeting = line.match(MEETING);
    if (!meeting) {
      if (NO_PLACE.test(line) && /\bTBA\b/.test(line)) skip(course.code, 'No set meeting time or room (online or TBA).');
      return;
    }

    // The room: the next field on this row, else (phone layout) the next line.
    const rest = line.slice(meeting.index! + meeting[0].length);
    const roomText = rest.includes('\t')
      ? (rest.split('\t').find((field) => field.trim()) ?? '')
      : rest.trim() || (lines.slice(i + 1).find((next) => next.trim()) ?? '');
    if (NO_PLACE.test(roomText)) return skip(course.code, 'No set meeting time or room (online or TBA).');
    const place = placeRoom(roomText, buildings);
    if (!place) return skip(course.code, 'No room listed for this meeting. Add it by hand.');
    if ('unknown' in place) return skip(course.code, `Building "${place.unknown}" is not on the map. Add this class by hand.`);

    const kind = component === 'Laboratory' ? 'Lab' : component;
    const entry: AddClassInput = {
      courseCode: course.code,
      courseName: kind && kind !== 'Lecture' ? `${course.name} (${kind})` : course.name,
      buildingId: place.buildingId,
      roomNumber: place.roomNumber,
      days: parseDays(meeting[1]),
      startTime: to12h(meeting[2], meeting[3]),
      endTime: to12h(meeting[4], meeting[5]),
    };
    const key = JSON.stringify(entry);
    if (!seen.has(key)) {
      seen.add(key);
      classes.push(entry);
    }
  });
  return { classes: [...classes, ...parseWeekView(lines, buildings, skip)], skipped };
}
