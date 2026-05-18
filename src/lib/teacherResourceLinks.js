export const teacherResourceLinks = [
  {
    slug: "teachers",
    href: "/teachers",
    title: "Buddy Matcher for Teachers",
    summary:
      "A teacher-focused overview of using Buddy Matcher for quick, controlled classroom pairs and groups.",
  },
  {
    slug: "random-student-group-generator",
    href: "/random-student-group-generator",
    title: "Random Student Group Generator",
    summary:
      "Make random student groups quickly for lessons, activities, projects and classroom routines.",
  },
  {
    slug: "how-to-randomly-group-students-fairly",
    href: "/how-to-randomly-group-students-fairly",
    title: "How to Randomly Group Students Fairly",
    summary:
      "A practical guide to fair student grouping without adding more teacher admin.",
  },
  {
    slug: "avoid-repeat-student-pairings",
    href: "/avoid-repeat-student-pairings",
    title: "How to Avoid Repeat Student Pairings",
    summary:
      "Reduce repeated pairings so students do not always end up with the same partner.",
  },
  {
    slug: "classroom-pairing-strategies",
    href: "/classroom-pairing-strategies",
    title: "Classroom Pairing Strategies",
    summary:
      "Compare random pairing, mixed groups, leaders and teacher constraints for different lesson moments.",
  },
  {
    slug: "random-group-generator-primary-teachers",
    href: "/random-group-generator-primary-teachers",
    title: "Random Group Generator for Primary Teachers",
    summary:
      "Simple grouping ideas for primary classrooms, table work, carpet activities and mixed friendship groups.",
  },
];

export function getTeacherResourceLink(slug) {
  return teacherResourceLinks.find((page) => page.slug === slug);
}
