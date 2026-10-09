// DLSU Manila colleges: one list for the whole app (profile setup, Profile, analytics labels).
// Codes are DLSU's own, so a student's college reads the same everywhere and the college
// breakdown in EMA analytics never splits one college across two codes.
export const DLSU_COLLEGES: { abbr: string; name: string; courses: string[] }[] = [
  { abbr: 'BAGCED', name: 'Br. Andrew Gonzalez FSC College of Education', courses: ['BS Education (major in English)', 'BS Education (major in Mathematics)', 'BS Education (major in Science)'] },
  { abbr: 'CCS',    name: 'College of Computer Studies',              courses: ['BS Computer Science', 'BS Information Technology', 'BS Information Systems'] },
  { abbr: 'CLA',    name: 'College of Liberal Arts',                  courses: ['AB Communication', 'AB Political Science', 'AB Psychology', 'AB Philosophy'] },
  { abbr: 'COS',    name: 'College of Science',                       courses: ['BS Biology', 'BS Chemistry', 'BS Mathematics', 'BS Physics'] },
  { abbr: 'GCOE',   name: 'Gokongwei College of Engineering',         courses: ['BS Chemical Engineering', 'BS Civil Engineering', 'BS Electronics Engineering', 'BS Industrial Engineering', 'BS Mechanical Engineering', 'BS Computer Engineering'] },
  { abbr: 'RVRCOB', name: 'Ramon V. del Rosario College of Business', courses: ['BS Accountancy', 'BS Business Administration', 'BS Entrepreneurship', 'BS Management of Financial Institutions'] },
  { abbr: 'SOE',    name: 'School of Economics',                      courses: ['BS Economics', 'BS Applied Economics'] },
  { abbr: 'TDSOL',  name: 'Tañada-Diokno School of Law',              courses: ['Juris Doctor'] },
];
