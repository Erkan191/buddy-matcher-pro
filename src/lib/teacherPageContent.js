import { getTeacherResourceLink } from "@/lib/teacherResourceLinks";

const siteUrl = "https://www.buddymatcher.co.uk";

const teacherPages = {
  teachers: {
    slug: "teachers",
    metadataTitle: "Buddy Matcher for Teachers",
    description:
      "Buddy Matcher helps teachers create random student pairs and groups, avoid awkward pairings, reduce repeats and save class lists.",
    eyebrow: "Teacher resources",
    title: "Buddy Matcher for Teachers",
    intro: [
      "Buddy Matcher is a simple group maker for classrooms, clubs, tutoring sessions, workshops and teams. Paste in a list of names, choose the group size, and create pairs or groups without turning it into a spreadsheet job.",
      "For teachers, the useful part is not just randomness. Classroom grouping often needs a little control: avoiding awkward student pairings, mixing friendship groups, spreading confident leaders and reducing the chance that the same students work together every time.",
    ],
    highlights: [
      "Create pairs, trios and larger groups from one class list.",
      "Keep specific students apart when that helps the lesson run smoothly.",
      "Reduce repeat pairings where possible across repeated activities.",
      "Save named lists, spread group leaders, export CSVs and print results with Pro.",
    ],
    sections: [
      {
        heading: "Classroom grouping is rarely just random",
        body: [
          "A basic random group generator can be useful, but teachers often need more than a quick shuffle. You may want to avoid a pairing that usually distracts both students, separate a friendship group for one lesson, or make sure a group has someone confident enough to start the task.",
          "Buddy Matcher keeps the process quick while giving you practical controls when you need them. You can still make groups in seconds, but you do not have to accept a result that creates obvious classroom problems.",
        ],
      },
      {
        heading: "Useful for everyday lesson moments",
        body: [
          "Use it for talk partners, practical tasks, reading groups, revision activities, project groups, seating changes, clubs and short collaborative tasks. It also works outside school for workshops, training sessions and community groups.",
          "The free tool is enough for quick random pairs and trios. Pro is aimed at repeated classroom use, where saved lists, no-repeat pairing history and specific pairing rules save time over a week or term.",
        ],
      },
      {
        heading: "Controls that match real classroom decisions",
        body: [
          "The most useful controls are the ones that reflect decisions teachers already make. The Don't group these two option helps with behaviour, focus or awkward dynamics. No-repeat pairing history helps stop the same students always working together. Group leaders help spread responsibility across groups.",
        ],
        bullets: [
          "Keep two named students apart for a particular activity.",
          "Try to avoid pairings from the previous round.",
          "Reuse saved class lists instead of pasting names every time.",
          "Create bigger groups for practical work or projects.",
        ],
      },
      {
        heading: "Simple enough to use during a lesson",
        body: [
          "The aim is to keep grouping quick. Paste the names, choose the size, generate, then adjust only if the class context needs it. The result should support the lesson rather than become another admin task.",
        ],
      },
    ],
    useCases: [
      "Talk partners for a starter question",
      "Mixed groups for practical science or design work",
      "Reading, intervention or revision pairs",
      "Project groups with leaders spread across the room",
      "Club, workshop or tutoring session groups",
    ],
    ctaTitle: "Try the classroom group maker",
    ctaText:
      "Open Buddy Matcher, paste a class list and generate student pairs or groups in seconds.",
    bottomCtaTitle: "Ready to make groups for your next lesson?",
  },
  "random-student-group-generator": {
    slug: "random-student-group-generator",
    metadataTitle: "Random Student Group Generator",
    description:
      "Use Buddy Matcher as a random student group generator for pairs, trios, larger groups, saved lists and classroom grouping rules.",
    eyebrow: "Classroom group maker",
    title: "Random Student Group Generator",
    intro: [
      "A random student group generator should be fast enough to use during a lesson and flexible enough for real classrooms. Buddy Matcher lets you paste a list of student names, choose a group size, and create random groups without manual sorting.",
      "It is useful for teachers, tutors, club leaders and workshop hosts who need quick groups but still want sensible control when the first random result is not right for the room.",
    ],
    highlights: [
      "Paste names from a register, spreadsheet or notes app.",
      "Generate pairs, trios and Pro group sizes like 4, 5, 6 or custom.",
      "Handle awkward leftovers without leaving one student isolated.",
      "Use Pro controls for blocked pairs, saved lists, leaders and repeat history.",
    ],
    sections: [
      {
        heading: "What makes a good student group generator?",
        body: [
          "Speed matters. Teachers should not have to set up a new spreadsheet, write names on slips of paper or manually drag students into groups every lesson. A good generator lets you paste names, choose the size and move on.",
          "Control matters too. A completely random result can still create a group you know will not work. Buddy Matcher is built around quick random grouping with optional controls for repeated classroom use.",
        ],
      },
      {
        heading: "A simple classroom workflow",
        body: [
          "Start with your class list, one name per line. Choose whether you want pairs, trios or a larger group size. Generate the groups, scan the result, then use any controls you need for behaviour, participation or fairness.",
          "If you use the same classes often, saved lists can remove the repeated setup. That is especially useful for teachers moving between classes or running several groups in a week.",
        ],
        bullets: [
          "Use pairs for quick discussion and retrieval practice.",
          "Use groups of 3 or 4 for shared problem solving.",
          "Use larger groups for projects, performances or practical tasks.",
          "Export or print results when you need a clean copy.",
        ],
      },
      {
        heading: "Fairer groups without pretending every class is the same",
        body: [
          "Random grouping can feel fair because students can see that the teacher is not simply choosing favourites. But fair does not always mean ignoring classroom context. You may still need to keep two students apart, rotate partners, or spread confident leaders across groups.",
          "Buddy Matcher supports that middle ground: start random, then use light-touch rules where the class needs them.",
        ],
      },
      {
        heading: "Works beyond the classroom",
        body: [
          "Although this page focuses on students, the same tool works for staff training, youth groups, sports clubs, workshops and community activities. Any list of names can be turned into quick pairs or groups.",
        ],
      },
    ],
    useCases: [
      "Random student pairs for a lesson starter",
      "Groups for practical tasks or experiments",
      "Revision teams before an assessment",
      "Mixed groups for project work",
      "Workshop or club groups outside normal lessons",
    ],
    ctaTitle: "Generate student groups now",
    ctaText:
      "Open Buddy Matcher and create random student groups from a pasted list of names.",
    bottomCtaTitle: "Need quick student groups without the spreadsheet?",
  },
  "how-to-randomly-group-students-fairly": {
    slug: "how-to-randomly-group-students-fairly",
    metadataTitle: "How to Randomly Group Students Fairly",
    description:
      "A practical guide to fair random student grouping for teachers, including repeats, friendship groups, behaviour and participation.",
    eyebrow: "Fair grouping guide",
    title: "How to Randomly Group Students Fairly",
    intro: [
      "Fair student grouping does not mean every group has to be perfect. It means students can see a clear process, the teacher can avoid obvious problems, and the same students do not always get the same experience.",
      "Buddy Matcher helps by starting with a random process, then adding practical controls for repeat pairings, group leaders, saved lists and pairs that should not be grouped together.",
    ],
    highlights: [
      "Use randomness to reduce arguments about who works with whom.",
      "Add light constraints for behaviour, confidence and classroom dynamics.",
      "Track repeat pairings where possible so groups rotate over time.",
      "Keep the process simple enough to repeat across lessons.",
    ],
    sections: [
      {
        heading: "Start by deciding what fair means for the task",
        body: [
          "Fair grouping changes with the lesson. For a two-minute retrieval question, fair might mean any random partner is fine. For a longer project, fair might mean mixed confidence levels, no repeated close friendship group, and leaders spread across tables.",
          "Before generating groups, decide what matters most for that activity: participation, calm behaviour, peer support, variety, or speed.",
        ],
      },
      {
        heading: "Use a visible random process",
        body: [
          "Students are more likely to accept groups when the process feels consistent. A random group generator gives you that neutral starting point. You can explain that the first step is random, then make limited adjustments only where the lesson needs them.",
          "That balance is important. If every result is heavily edited, students may stop trusting the process. If no result is ever adjusted, the grouping may ignore obvious classroom needs.",
        ],
      },
      {
        heading: "Avoid the same pairings every time",
        body: [
          "One hidden unfairness is repetition. If the same two students always end up together, they may miss chances to practise with other classmates. Some students become dependent on one partner, while others rarely get to work with different peers.",
          "Buddy Matcher Pro can reduce repeat pairings where possible, which helps make repeated activities feel more varied over time.",
        ],
      },
      {
        heading: "Use constraints carefully",
        body: [
          "A constraint should solve a real classroom problem, not replace teacher judgement. It can be reasonable to keep two students apart for a specific activity, spread leaders across groups or use saved lists so you do not re-enter names.",
          "The goal is not to engineer perfect groups. The goal is to make a fair, workable grouping quickly so the lesson keeps moving.",
        ],
        bullets: [
          "Set the group size before you generate.",
          "Use blocked pairs only where there is a clear reason.",
          "Rotate pairings across repeated activities.",
          "Scan the final result before sharing it with the class.",
        ],
      },
    ],
    useCases: [
      "Making discussion pairs feel neutral",
      "Rotating partners over a sequence of lessons",
      "Separating distracting combinations for one task",
      "Spreading confident group leaders",
      "Keeping setup time low during a busy lesson",
    ],
    ctaTitle: "Make fairer random groups",
    ctaText:
      "Use Buddy Matcher to start with random groups, then add simple classroom controls when needed.",
    bottomCtaTitle: "Want a fair grouping process you can repeat?",
  },
  "avoid-repeat-student-pairings": {
    slug: "avoid-repeat-student-pairings",
    metadataTitle: "How to Avoid Repeat Student Pairings",
    description:
      "Learn how teachers can avoid repeat student pairings and use Buddy Matcher to vary classroom partners over time.",
    eyebrow: "No-repeat grouping",
    title: "How to Avoid Repeat Student Pairings",
    intro: [
      "Repeat pairings are easy to miss. A class can look randomly grouped, but the same students may still keep ending up together over several activities, especially in smaller classes or repeated pair work.",
      "Buddy Matcher Pro includes no-repeat pairing history to reduce repeated pairings where possible. It is designed for teachers who want students to work with a wider range of classmates without tracking every past pair by hand.",
    ],
    highlights: [
      "Reduce the same students repeatedly working together.",
      "Encourage wider participation across the class.",
      "Avoid manual notes about who worked with whom last time.",
      "Combine no-repeat history with blocked pairs and group leaders.",
    ],
    sections: [
      {
        heading: "Why repeat pairings matter",
        body: [
          "Working with the same partner is not always a problem. Sometimes it is useful. But if it happens too often, students can settle into fixed roles, rely on the same friend, or miss chances to practise explaining ideas to different people.",
          "For teachers, repeated pairings can also create behaviour patterns. A pair that was fine for one short task may not be the best choice for a longer activity later in the week.",
        ],
      },
      {
        heading: "The manual way is hard to maintain",
        body: [
          "You can track pairings on paper or in a spreadsheet, but that quickly becomes another admin job. It is especially awkward when students are absent, when you switch from pairs to groups, or when you need groups in the middle of a lesson.",
          "A no-repeat pairing feature does that checking in the background so you can focus on whether the final groups make sense.",
        ],
      },
      {
        heading: "How Buddy Matcher helps",
        body: [
          "When no-repeat pairing history is active, Buddy Matcher checks previous pairings for that list and tries to reduce repeats in the next generated result. It cannot make an impossible class arrangement possible, but it can help avoid obvious repeats where the numbers allow.",
          "This is most useful for regular routines: weekly discussion partners, repeated revision tasks, reading pairs, project groups or practical activities across a unit.",
        ],
      },
      {
        heading: "Make it part of a simple routine",
        body: [
          "Use the same saved list for the class, generate groups, and keep no-repeat history on for repeated tasks. If there is a classroom reason to keep two students apart, add that as a separate rule rather than trying to remember it manually.",
        ],
        bullets: [
          "Use saved named lists for each class.",
          "Generate pairs or groups from the same list over time.",
          "Use no-repeat history to vary partnerships.",
          "Reset or ignore history when a task needs a fresh start.",
        ],
      },
    ],
    useCases: [
      "Weekly talk partners",
      "Repeated peer feedback tasks",
      "Reading or revision pair rotations",
      "Science practical groups across a topic",
      "Project groups where students need new collaborators",
    ],
    ctaTitle: "Try no-repeat student grouping",
    ctaText:
      "Open Buddy Matcher and use Pro controls when you need pairing history, saved lists and classroom rules.",
    bottomCtaTitle: "Ready to vary student pairings more easily?",
  },
  "classroom-pairing-strategies": {
    slug: "classroom-pairing-strategies",
    metadataTitle: "Classroom Pairing Strategies",
    description:
      "Practical classroom pairing strategies for teachers, including random pairs, mixed groups, friendship groups, leaders and repeat pairings.",
    eyebrow: "Classroom strategies",
    title: "Classroom Pairing Strategies",
    intro: [
      "There is no single best classroom pairing strategy. The right choice depends on the task, the class, the time available and how much teacher control is needed.",
      "Buddy Matcher is useful when you want the speed and neutrality of random grouping, with enough control to handle behaviour, repeat pairings, friendship groups and leaders.",
    ],
    highlights: [
      "Choose pairs or groups based on the lesson task.",
      "Use random pairing when speed and neutrality matter.",
      "Use constraints when classroom dynamics need attention.",
      "Rotate partners over time to support wider participation.",
    ],
    sections: [
      {
        heading: "Random pairs for quick participation",
        body: [
          "Random pairs work well for short discussion, retrieval practice, peer explanation and quick checks for understanding. They reduce negotiation time and make it clear that the pairing is not personal.",
          "For a short activity, the main goal is often speed. Generate the pairs, share them, and get students talking.",
        ],
      },
      {
        heading: "Controlled random groups for longer tasks",
        body: [
          "Longer activities often need more control. A random start is still useful, but you may want to prevent one difficult pairing, avoid repeated partners or spread group leaders across the room.",
          "Buddy Matcher supports this by keeping random generation as the base and adding practical controls only where needed.",
        ],
      },
      {
        heading: "Mixing friendship groups",
        body: [
          "Friendship groups can be positive, but they can also reduce focus or leave some students out. A random generator helps mix the class without making it feel like the teacher is targeting one friendship group.",
          "If two students should not be together for a specific lesson, the Don't group these two option is a direct way to handle that without manually rebuilding every group.",
        ],
      },
      {
        heading: "Using group leaders",
        body: [
          "Some tasks benefit from a leader, organiser or confident starter in each group. This can help with practical work, project roles, equipment collection or making sure instructions are understood.",
          "With Buddy Matcher Pro, you can mark group leaders and spread them across groups instead of hoping the random result does it naturally.",
        ],
      },
      {
        heading: "Choosing a strategy quickly",
        body: [
          "Use random pairs when the task is short. Use controlled random groups when the activity is longer or behaviour matters. Use no-repeat history when you repeat grouping often. Use leaders when groups need structure from the start.",
        ],
      },
    ],
    useCases: [
      "Think-pair-share discussions",
      "Peer feedback partners",
      "Mixed project groups",
      "Practical task teams",
      "Group leader rotations",
    ],
    ctaTitle: "Choose a strategy and make the groups",
    ctaText:
      "Use Buddy Matcher to create quick classroom pairs or controlled groups for the activity in front of you.",
    bottomCtaTitle: "Need a faster way to put pairing strategies into practice?",
  },
  "random-group-generator-primary-teachers": {
    slug: "random-group-generator-primary-teachers",
    metadataTitle: "Random Group Generator for Primary Teachers",
    description:
      "A simple random group generator for primary teachers making classroom pairs, table groups, activity groups and mixed friendship groups.",
    eyebrow: "Primary teacher grouping",
    title: "Random Group Generator for Primary Teachers",
    intro: [
      "Primary classrooms need grouping tools that are quick, calm and easy to explain. Buddy Matcher helps primary teachers make random pairs and groups for table work, carpet activities, practical tasks, reading, PE-style activities and short collaborative lessons.",
      "It can be used as a simple random group generator, or with Pro controls when you need saved class lists, group leaders, no-repeat pairings or a way to keep specific students apart for a task.",
    ],
    highlights: [
      "Make quick pairs, trios or larger classroom groups.",
      "Mix friendship groups without spending lesson time rearranging names.",
      "Save regular class lists for repeated use.",
      "Use simple rules for behaviour, leaders and repeated pairings.",
    ],
    sections: [
      {
        heading: "Fast groups for busy primary classrooms",
        body: [
          "Primary teachers often need groups at short notice: partners for a talk task, teams for a practical activity, reading pairs, table challenges or groups for a carousel. The grouping tool should be faster than doing it by hand.",
          "Buddy Matcher keeps the setup simple. Paste the class list, choose the size, generate, then share the result when you are happy with it.",
        ],
      },
      {
        heading: "Mixing friendship groups with less fuss",
        body: [
          "Friendship groups can support confidence, but they can also make some activities noisier or less balanced. Random grouping gives a neutral reason for mixing the class and can reduce arguments about who works with whom.",
          "If a particular pairing is not right for the activity, Pro lets you keep those two students apart without rebuilding the whole class list.",
        ],
      },
      {
        heading: "Useful for repeated weekly routines",
        body: [
          "Saved lists are helpful when you use the same class list again and again. No-repeat pairing history can also help when you want children to work with different classmates across a week or half term.",
          "This is useful for talk partners, reading rotations, topic work, maths investigations and group challenges.",
        ],
      },
      {
        heading: "Group leaders and classroom roles",
        body: [
          "Some primary activities work better when each group has a confident reader, equipment monitor, recorder or group leader. Buddy Matcher Pro can spread named leaders across groups so one table does not accidentally get all the confident starters.",
        ],
        bullets: [
          "Spread leaders across practical groups.",
          "Use groups of 4, 5, 6 or a custom size with Pro.",
          "Export or print groups for supply notes or classroom display.",
          "Keep the free tool for quick pairs and trios.",
        ],
      },
    ],
    useCases: [
      "Talk partners on the carpet",
      "Reading or phonics pairs",
      "Maths investigation groups",
      "Topic or science activity teams",
      "Classroom helper or leader groups",
    ],
    ctaTitle: "Make primary class groups",
    ctaText:
      "Open Buddy Matcher, paste your class list and create primary classroom pairs or groups quickly.",
    bottomCtaTitle: "Need quick groups for your primary class?",
  },
};

Object.values(teacherPages).forEach((page) => {
  const link = getTeacherResourceLink(page.slug);
  page.href = link.href;
  page.resourceTitle = link.title;
  page.resourceSummary = link.summary;
});

export function getTeacherPage(slug) {
  return teacherPages[slug];
}

export function getTeacherPageMetadata(slug) {
  const page = getTeacherPage(slug);

  return {
    title: page.metadataTitle,
    description: page.description,
    alternates: {
      canonical: page.href,
    },
    openGraph: {
      title: page.metadataTitle,
      description: page.description,
      url: `${siteUrl}${page.href}`,
      siteName: "Buddy Matcher",
      type: "article",
    },
    twitter: {
      card: "summary",
      title: page.metadataTitle,
      description: page.description,
    },
  };
}

export function getTeacherPageJsonLd(page) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.metadataTitle,
    description: page.description,
    mainEntityOfPage: `${siteUrl}${page.href}`,
    publisher: {
      "@type": "Organization",
      name: "Buddy Matcher",
      url: siteUrl,
    },
  };
}
