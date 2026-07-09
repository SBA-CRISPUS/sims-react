/**
 * The ECZ secondary-school subject catalogue (Forms 1-4), from the ECZ
 * CBA Assessment Guidelines & Blueprint. The blueprint's cover lists 16
 * teaching subjects; its subject-specific guidelines assess Biology,
 * Chemistry and Physics individually (each with its own construct and
 * SBA tasks), so "Science" appears here as those three subjects.
 *
 * The blueprint publishes NO official numeric subject codes, so `code`
 * is a suggested mnemonic only - schools may replace it with their own
 * (or an official ECZ code once published) before saving. `department`
 * names the provisioned default department the subject usually belongs
 * to; the form matches it by name against the school's own (editable)
 * department list and leaves the subject unassigned when no match.
 */
export interface CatalogueSubject {
  code: string;
  name: string;
  department: string;
}

export const ECZ_SUBJECT_CATALOGUE: CatalogueSubject[] = [
  { code: "MATH", name: "Mathematics", department: "Mathematics" },
  { code: "ENG", name: "English Language", department: "Languages" },
  { code: "BIO", name: "Biology", department: "Sciences" },
  { code: "CHE", name: "Chemistry", department: "Sciences" },
  { code: "PHY", name: "Physics", department: "Sciences" },
  { code: "CIV", name: "Civic Education", department: "Arts" },
  { code: "HIS", name: "History", department: "Arts" },
  { code: "GEO", name: "Geography", department: "Arts" },
  { code: "RE", name: "Religious Education", department: "Arts" },
  { code: "ZAM", name: "Zambian Languages", department: "Languages" },
  { code: "LIT", name: "Literature in English", department: "Languages" },
  { code: "ICT", name: "Computer Studies/ICT", department: "Practical" },
  { code: "PES", name: "Physical Education and Sport", department: "Practical" },
  { code: "ART", name: "Art and Design", department: "Arts" },
  { code: "MUS", name: "Music Arts", department: "Arts" },
  { code: "FNU", name: "Food and Nutrition", department: "Practical" },
  { code: "TAT", name: "Travel and Tourism", department: "Commercial" },
  { code: "AGR", name: "Agricultural Science", department: "Practical" },
];
