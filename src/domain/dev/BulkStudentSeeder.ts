import { StreamService } from "../academic/StreamService";
import { streamId as makeStreamId } from "../academic/Stream";
import { StudentAdmissionService } from "../students/StudentAdmissionService";
import { SbaMarkService } from "../assessments/SbaMarkService";
import type { GuardianRelationship } from "../students/Guardian";

/** The curated class list (your finalised names, duplicates removed). */
const NAMES = [
  "Liam O'Brien", "Emma Sullivan", "Noah Kelly", "Olivia Kennedy", "Mason Byrne",
  "Ava Ryan", "Logan Walsh", "Isabella Quinn", "Ethan Burke", "Mia Fitzpatrick",
  "Jackson Murphy", "Charlotte O'Donnell", "Aiden Hayes", "Amelia Brennan", "Grayson Foley",
  "Harper Doyle", "Carter McCarthy", "Evelyn Moran", "Wyatt Cunningham", "Abigail Hogan",
  "Henry Reilly", "Ella O'Neill", "Owen Connolly", "Scarlett Whelan", "Nathan Sweeney",
  "Grace O'Keefe", "Samuel Nolan", "Chloe Dwyer", "Levi Lyons", "Penelope Bradley",
  "Isaac Porter", "Lily Grant", "Gabriel Harvey", "Zoey Price", "Julian Barnes",
  "Hazel Palmer", "Eli Richardson", "Aurora Foster", "Ezra Butler", "Lucy Henderson",
  "Sebastian Welch", "Stella Watts", "Elias Rhodes", "Eleanor Hardy", "Mateo Reeves",
  "Nora Sutton", "Luca Morrison", "Mila Burgess", "Kai Saunders", "Violet Robbins",
  "Leo Pearson", "Iris Francis", "Asher Stone", "Ember Payne", "Silas Shaw",
  "Willow George", "Arlo Bryant", "Aria Page", "Theo Reid", "Nova Cook",
  "Jude Bennett", "Lily-Rose Knight", "Finn Hughes", "Isla Crawford", "Max Dixon",
  "Ivy Cole", "Oscar Dean", "Ruby Ford", "Miles Pierce", "Clara Banks",
  "Jonah Hunt", "Eliza Blake", "Rowan Gibbs", "Ada Spencer", "Cole Ramsey",
  "Sara Marsh", "Flynn Hudson", "Eva Lambert", "Damien Fox", "June Stevenson",
  "Rhett Bishop", "Thea Chambers", "Wayne Dawson", "Odette Fletcher", "Brock Carlson",
  "Pearl Buchanan", "Craig Shields", "Greta Ochoa", "Lance Zimmerman", "Tessa Brock",
  "Heath Avery", "Freya French", "Bryce Hart", "Sienna Chen", "Zane Lawrence",
  "Lyra Weaver", "Chase Jacobs", "Lila Parsons", "Knox Gilmore", "Gemma West",
  "Atlas Black", "Wren Olson", "Beckett Wallace", "Nellie Tucker", "Enzo Simpson",
  "Ophelia Glover", "Jasper Bowen", "Daisy Thornton", "Archie Norton", "Rosalie Kane",
  "Otto Heath", "Maeve Larson", "Felix Wong", "Daphne MacGregor", "Hugo Bellamy",
  "Cleo Dunlap", "Finnian O'Neil", "Bridget Callahan", "Ronan Shea", "Siobhan Donovan",
  "Declan FitzGerald", "Niamh O'Connor", "Cillian Gallagher", "Sorcha McGrath", "Eoin Connell",
  "Roisin Carney", "Tiernan Hagan", "Keira Lynch", "Oisin Doherty", "Aislinn O'Rourke",
  "Callum McAllister", "Fiona Gilchrist", "Hamish Duncan", "Catriona McKenzie", "Ewan Fraser",
  "Morag Sinclair", "Alistair Munro", "Lorna Beattie", "Gregor Mackay", "Kirsty Jardine",
  "Magnus Craig", "Elspeth Steele", "Angus Millar", "Leonie Booth", "Torin Wade",
  "Shona Cross", "Lachlan Blackwood", "Eilidh Burnett", "Brodie Fergusson", "Mhairi Guthrie",
  "Ruairi Bowie", "Ailsa Dewar", "Innes MacLean", "Mairead Gilmour", "Fraser MacKenzie",
  "Annabel Rattray", "Findlay Scobie", "Peigi Orr", "Dermot Maher", "Tara Molloy",
];

/** Female first names in the list, for a sensible gender guess. */
const FEMALE_FIRSTS = new Set([
  "Emma", "Olivia", "Ava", "Isabella", "Mia", "Charlotte", "Amelia", "Harper",
  "Evelyn", "Abigail", "Ella", "Scarlett", "Grace", "Chloe", "Penelope", "Lily",
  "Zoey", "Hazel", "Aurora", "Lucy", "Stella", "Eleanor", "Nora", "Mila", "Violet",
  "Iris", "Ember", "Willow", "Aria", "Nova", "Lily-Rose", "Isla", "Ivy", "Ruby",
  "Clara", "Eliza", "Ada", "Sara", "Eva", "June", "Thea", "Odette", "Pearl", "Greta",
  "Tessa", "Freya", "Sienna", "Lyra", "Lila", "Gemma", "Wren", "Nellie", "Ophelia",
  "Daisy", "Rosalie", "Maeve", "Daphne", "Cleo", "Bridget", "Siobhan", "Niamh",
  "Sorcha", "Roisin", "Keira", "Aislinn", "Fiona", "Catriona", "Morag", "Lorna",
  "Kirsty", "Elspeth", "Leonie", "Shona", "Eilidh", "Mhairi", "Ailsa", "Mairead",
  "Annabel", "Peigi", "Tara",
]);

export const MAX_BULK = 188;

function splitName(full: string): { first: string; last: string } {
  const i = full.indexOf(" ");
  return { first: full.slice(0, i), last: full.slice(i + 1) };
}

export interface BulkAdmitInput {
  schoolCode: string;
  actorUid: string;
  academicYearId: string;
  levelCode: string;
  streamCode: string;
  target: number; // admit up to this many in the class
  onProgress: (done: number, total: number, message: string) => void;
}

export class BulkStudentSeeder {
  /** The name for a given class position. Beyond the curated list it
   * recombines first + last names from the pool to stay in the same style. */
  static nameAt(index: number): { first: string; last: string } {
    if (index < NAMES.length) return splitName(NAMES[index]);
    const k = index - NAMES.length;
    const first = splitName(NAMES[k % NAMES.length]).first;
    const last = splitName(NAMES[(k * 13 + 7) % NAMES.length]).last;
    return { first, last };
  }

  /**
   * Admits learners into (year, form, stream) until the class holds
   * `target` of them, using the curated names. Each admission goes through
   * the normal transactional StudentAdmissionService (student + guardian +
   * enrollment + counters, audited by onStudentAdmitted), so it runs under
   * the signed-in admin's permissions with no rule bypass. Admissions are
   * sequential (the counters can't run in parallel) - 188 takes a few
   * minutes and needs connectivity.
   */
  static async admitClass(input: BulkAdmitInput): Promise<{ admitted: number }> {
    const { schoolCode, actorUid, academicYearId, levelCode, streamCode, target, onProgress } =
      input;
    const sid = makeStreamId(levelCode, streamCode);
    const capacity = Math.max(target, 50);

    // Ensure the stream exists and is big enough (capacity is a soft cap).
    try {
      await StreamService.createStream(schoolCode, {
        academicLevelCode: levelCode,
        streamCode,
        name: `${levelCode} ${streamCode.toUpperCase()}`,
        capacity,
      });
      onProgress(0, target, `Stream ${sid} created (capacity ${capacity}).`);
    } catch {
      try {
        await StreamService.updateStream(schoolCode, sid, { capacity });
      } catch {
        /* ignore */
      }
      onProgress(0, target, `Stream ${sid} exists — capacity set to ${capacity}.`);
    }

    const roster = await SbaMarkService.listRoster(schoolCode, academicYearId, sid);
    const start = roster.length;
    const toAdmit = Math.max(0, target - start);
    onProgress(
      0,
      toAdmit,
      `${start} already enrolled in ${sid}; admitting ${toAdmit} to reach ${target}...`
    );

    let admitted = 0;
    for (let i = 0; i < toAdmit; i++) {
      const pos = start + i;
      const { first, last } = this.nameAt(pos);
      const gender = FEMALE_FIRSTS.has(first) ? "Female" : "Male";
      const dob = new Date(new Date().getFullYear() - 14, pos % 12, (pos % 27) + 1);

      const res = await StudentAdmissionService.admit(schoolCode, actorUid, {
        student: {
          firstName: first,
          lastName: last,
          gender,
          dateOfBirth: dob,
          nationality: "Zambian",
        },
        guardian: {
          firstName: "Guardian",
          lastName: last,
          relationship: (pos % 2 === 0 ? "Mother" : "Father") as GuardianRelationship,
          phone: `097${String(2000000 + pos).padStart(7, "0")}`,
        },
        enrollment: {
          academicYearId,
          academicLevelCode: levelCode,
          // Enrollments store the stream CODE ("A"), matching the admission
          // wizard and the occupancy Cloud Function - not the composite id.
          streamId: streamCode,
          admissionDate: new Date(),
          status: "active",
        },
      });

      admitted++;
      onProgress(admitted, toAdmit, `✓ ${res.studentNumber} — ${first} ${last}`);
    }

    return { admitted };
  }
}
