export interface AcademicYear {
  academicYearId: string;
  name: string;
  year: number;
  current: boolean;
  status: string;
}

export interface Term {
  termId: string;
  name: string;
  order: number;
  current: boolean;
  locked: boolean;
  status: string;
}
