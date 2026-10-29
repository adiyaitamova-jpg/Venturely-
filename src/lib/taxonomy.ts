import type {
  AchievementLevel,
  AchievementType,
  Availability,
  Commitment,
  ExperienceLevel,
  MemberRole,
  MilestoneStatus,
  PortfolioKind,
  ProfileVisibility,
  ProjectCategory,
  ProjectStage,
  RankCategory,
  Region,
  ReportReason,
  SkillCategory,
  SkillLevel,
  VerificationStatus,
} from "@prisma/client";

/** Canonical skill taxonomy. Seeded into the Skill table; matching normalises against it. */
export const SKILLS: { name: string; category: SkillCategory }[] = [
  // Engineering
  { name: "TypeScript", category: "ENGINEERING" },
  { name: "JavaScript", category: "ENGINEERING" },
  { name: "Python", category: "ENGINEERING" },
  { name: "React", category: "ENGINEERING" },
  { name: "Next.js", category: "ENGINEERING" },
  { name: "Node.js", category: "ENGINEERING" },
  { name: "Swift", category: "ENGINEERING" },
  { name: "Kotlin", category: "ENGINEERING" },
  { name: "Flutter", category: "ENGINEERING" },
  { name: "Java", category: "ENGINEERING" },
  { name: "C++", category: "ENGINEERING" },
  { name: "Rust", category: "ENGINEERING" },
  { name: "Go", category: "ENGINEERING" },
  { name: "SQL", category: "ENGINEERING" },
  { name: "Backend APIs", category: "ENGINEERING" },
  { name: "Cloud & DevOps", category: "ENGINEERING" },
  { name: "Game development", category: "ENGINEERING" },
  { name: "Cybersecurity", category: "ENGINEERING" },
  // AI & data
  { name: "Machine learning", category: "AI_DATA" },
  { name: "Deep learning", category: "AI_DATA" },
  { name: "Computer vision", category: "AI_DATA" },
  { name: "NLP", category: "AI_DATA" },
  { name: "LLM applications", category: "AI_DATA" },
  { name: "Data analysis", category: "AI_DATA" },
  { name: "Statistics", category: "AI_DATA" },
  { name: "Data visualization", category: "AI_DATA" },
  // Hardware
  { name: "Arduino", category: "HARDWARE" },
  { name: "Raspberry Pi", category: "HARDWARE" },
  { name: "Embedded C", category: "HARDWARE" },
  { name: "CAD", category: "HARDWARE" },
  { name: "3D printing", category: "HARDWARE" },
  { name: "Electronics", category: "HARDWARE" },
  { name: "ROS", category: "HARDWARE" },
  // Research
  { name: "Lab research", category: "RESEARCH" },
  { name: "Literature review", category: "RESEARCH" },
  { name: "Experimental design", category: "RESEARCH" },
  { name: "Scientific writing", category: "RESEARCH" },
  { name: "Biology", category: "RESEARCH" },
  { name: "Chemistry", category: "RESEARCH" },
  { name: "Physics", category: "RESEARCH" },
  { name: "Mathematics", category: "RESEARCH" },
  { name: "Environmental science", category: "RESEARCH" },
  { name: "Neuroscience", category: "RESEARCH" },
  // Design
  { name: "Product design", category: "DESIGN" },
  { name: "UI design", category: "DESIGN" },
  { name: "UX research", category: "DESIGN" },
  { name: "Figma", category: "DESIGN" },
  { name: "Graphic design", category: "DESIGN" },
  { name: "Illustration", category: "DESIGN" },
  { name: "Video editing", category: "DESIGN" },
  { name: "Motion design", category: "DESIGN" },
  // Business
  { name: "Product management", category: "BUSINESS" },
  { name: "Market research", category: "BUSINESS" },
  { name: "Financial modeling", category: "BUSINESS" },
  { name: "Fundraising", category: "BUSINESS" },
  { name: "Growth marketing", category: "BUSINESS" },
  { name: "Operations", category: "BUSINESS" },
  { name: "Partnerships", category: "BUSINESS" },
  // Communication
  { name: "Technical writing", category: "COMMUNICATION" },
  { name: "Public speaking", category: "COMMUNICATION" },
  { name: "Pitching", category: "COMMUNICATION" },
  { name: "Community building", category: "COMMUNICATION" },
  { name: "Teaching", category: "COMMUNICATION" },
  { name: "Social media", category: "COMMUNICATION" },
];

export const PROJECT_CATEGORIES: { value: ProjectCategory; label: string; short: string }[] = [
  { value: "AI", label: "Artificial intelligence", short: "AI" },
  { value: "SOFTWARE", label: "Software engineering", short: "Software" },
  { value: "ROBOTICS", label: "Robotics & hardware", short: "Robotics" },
  { value: "RESEARCH", label: "Scientific research", short: "Research" },
  { value: "SUSTAINABILITY", label: "Sustainability", short: "Sustainability" },
  { value: "EDUCATION", label: "Education", short: "Education" },
  { value: "ENTREPRENEURSHIP", label: "Entrepreneurship", short: "Ventures" },
  { value: "DESIGN", label: "Design", short: "Design" },
  { value: "SOCIAL_IMPACT", label: "Social impact", short: "Social impact" },
];

export const CATEGORY_LABEL = Object.fromEntries(PROJECT_CATEGORIES.map((c) => [c.value, c.short])) as Record<
  ProjectCategory,
  string
>;

export const STAGES: { value: ProjectStage; label: string; description: string }[] = [
  { value: "IDEA", label: "Idea", description: "Exploring a problem worth solving" },
  { value: "PLANNING", label: "Planning", description: "Scoping, research and team building" },
  { value: "IN_PROGRESS", label: "In progress", description: "Actively building" },
  { value: "PROTOTYPE", label: "Prototype", description: "A working version exists" },
  { value: "LAUNCHED", label: "Launched", description: "Real people are using it" },
  { value: "COMPLETED", label: "Completed", description: "Finished with documented outcomes" },
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.value, s.label])) as Record<ProjectStage, string>;
export const STAGE_ORDER: ProjectStage[] = STAGES.map((s) => s.value);

export const AVAILABILITY: { value: Availability; label: string; hint: string }[] = [
  { value: "COMMITTED", label: "Committed", hint: "9+ hours a week" },
  { value: "PART_TIME", label: "Part-time", hint: "4–8 hours a week" },
  { value: "FEW_HOURS", label: "A few hours", hint: "1–3 hours a week" },
  { value: "NOT_AVAILABLE", label: "Not looking", hint: "Not joining new projects" },
];
export const AVAILABILITY_LABEL = Object.fromEntries(AVAILABILITY.map((a) => [a.value, a.label])) as Record<
  Availability,
  string
>;

export const COMMITMENT: { value: Commitment; label: string }[] = [
  { value: "LIGHT", label: "1–3 h / week" },
  { value: "MODERATE", label: "4–8 h / week" },
  { value: "INTENSIVE", label: "9+ h / week" },
];
export const COMMITMENT_LABEL = Object.fromEntries(COMMITMENT.map((c) => [c.value, c.label])) as Record<
  Commitment,
  string
>;

export const EXPERIENCE: { value: ExperienceLevel; label: string; hint: string }[] = [
  { value: "BEGINNER", label: "Getting started", hint: "First serious projects" },
  { value: "INTERMEDIATE", label: "Building", hint: "Shipped a few things" },
  { value: "ADVANCED", label: "Experienced", hint: "Led or shipped substantial work" },
];
export const EXPERIENCE_LABEL = Object.fromEntries(EXPERIENCE.map((e) => [e.value, e.label])) as Record<
  ExperienceLevel,
  string
>;

export const SKILL_LEVELS: { value: SkillLevel; label: string; rank: number }[] = [
  { value: "LEARNING", label: "Learning", rank: 1 },
  { value: "PRACTICED", label: "Practiced", rank: 2 },
  { value: "PROFICIENT", label: "Proficient", rank: 3 },
  { value: "EXPERT", label: "Expert", rank: 4 },
];
export const SKILL_LEVEL_LABEL = Object.fromEntries(SKILL_LEVELS.map((s) => [s.value, s.label])) as Record<
  SkillLevel,
  string
>;
export const SKILL_LEVEL_RANK = Object.fromEntries(SKILL_LEVELS.map((s) => [s.value, s.rank])) as Record<
  SkillLevel,
  number
>;

export const SKILL_CATEGORY_LABEL: Record<SkillCategory, string> = {
  ENGINEERING: "Engineering",
  AI_DATA: "AI & data",
  HARDWARE: "Hardware",
  RESEARCH: "Research & science",
  DESIGN: "Design",
  BUSINESS: "Business",
  COMMUNICATION: "Communication",
};

export const REGIONS: { value: Region; label: string }[] = [
  { value: "AFRICA", label: "Africa" },
  { value: "ASIA", label: "Asia" },
  { value: "EUROPE", label: "Europe" },
  { value: "MIDDLE_EAST", label: "Middle East" },
  { value: "NORTH_AMERICA", label: "North America" },
  { value: "OCEANIA", label: "Oceania" },
  { value: "SOUTH_AMERICA", label: "South America" },
];
export const REGION_LABEL = Object.fromEntries(REGIONS.map((r) => [r.value, r.label])) as Record<Region, string>;

export const VISIBILITY: { value: ProfileVisibility; label: string; hint: string }[] = [
  { value: "MEMBERS", label: "Members only", hint: "Signed-in TEAMi members can find and view you. Recommended." },
  { value: "PUBLIC", label: "Public", hint: "Anyone with your link can view your profile, including people without an account." },
  { value: "PRIVATE", label: "Private", hint: "Hidden from discovery, AI matching and leaderboards. Only you can see it." },
];

export const ACHIEVEMENT_TYPES: { value: AchievementType; label: string }[] = [
  { value: "AWARD", label: "Award" },
  { value: "COMPETITION", label: "Competition" },
  { value: "CERTIFICATION", label: "Certification" },
  { value: "PUBLICATION", label: "Publication" },
  { value: "PROGRAM", label: "Selective program" },
  { value: "OTHER", label: "Other" },
];
export const ACHIEVEMENT_TYPE_LABEL = Object.fromEntries(ACHIEVEMENT_TYPES.map((a) => [a.value, a.label])) as Record<
  AchievementType,
  string
>;

export const ACHIEVEMENT_LEVELS: { value: AchievementLevel; label: string }[] = [
  { value: "SCHOOL", label: "School" },
  { value: "REGIONAL", label: "Regional" },
  { value: "NATIONAL", label: "National" },
  { value: "INTERNATIONAL", label: "International" },
];
export const ACHIEVEMENT_LEVEL_LABEL = Object.fromEntries(
  ACHIEVEMENT_LEVELS.map((a) => [a.value, a.label]),
) as Record<AchievementLevel, string>;

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  SELF_REPORTED: "Self-reported",
  PENDING: "Verification pending",
  VERIFIED: "Verified",
  REJECTED: "Not verified",
};

export const PORTFOLIO_KINDS: { value: PortfolioKind; label: string }[] = [
  { value: "PROJECT", label: "Project" },
  { value: "RESEARCH", label: "Research" },
  { value: "OPEN_SOURCE", label: "Open source" },
  { value: "DESIGN", label: "Design work" },
  { value: "WRITING", label: "Writing" },
  { value: "OTHER", label: "Other" },
];
export const PORTFOLIO_KIND_LABEL = Object.fromEntries(PORTFOLIO_KINDS.map((k) => [k.value, k.label])) as Record<
  PortfolioKind,
  string
>;

export const MEMBER_ROLE_LABEL: Record<MemberRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export const RANK_CATEGORIES: { value: RankCategory; label: string; description: string }[] = [
  { value: "GLOBAL", label: "Overall", description: "All signals across every category" },
  { value: "ENGINEERING", label: "Engineering", description: "Software and robotics work" },
  { value: "AI", label: "AI", description: "Machine learning and AI projects" },
  { value: "RESEARCH", label: "Research", description: "Scientific research" },
  { value: "DESIGN", label: "Design", description: "Product, visual and UX design" },
  { value: "ENTREPRENEURSHIP", label: "Entrepreneurship", description: "Ventures and products" },
  { value: "IMPACT", label: "Impact", description: "Sustainability, education and social impact" },
];
export const RANK_CATEGORY_LABEL = Object.fromEntries(RANK_CATEGORIES.map((r) => [r.value, r.label])) as Record<
  RankCategory,
  string
>;

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam or low-effort content" },
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "INAPPROPRIATE", label: "Inappropriate content" },
  { value: "IMPERSONATION", label: "Impersonation" },
  { value: "FALSE_CLAIM", label: "False or misleading claim" },
  { value: "SAFETY_CONCERN", label: "Safety concern" },
  { value: "OTHER", label: "Something else" },
];

export const SUGGESTED_ROLES = [
  "Frontend engineer",
  "Backend engineer",
  "Full-stack engineer",
  "Mobile engineer",
  "ML engineer",
  "Data scientist",
  "Hardware engineer",
  "Researcher",
  "Product designer",
  "UX researcher",
  "Product lead",
  "Business & growth",
  "Writer / storyteller",
  "Community lead",
];

export const SUGGESTED_LANGUAGES = [
  "English",
  "Spanish",
  "Mandarin",
  "Hindi",
  "Arabic",
  "French",
  "Portuguese",
  "Russian",
  "German",
  "Japanese",
  "Korean",
  "Turkish",
  "Uzbek",
  "Indonesian",
  "Vietnamese",
  "Swahili",
];

export const SUGGESTED_CAUSES = [
  "Climate",
  "Education access",
  "Health",
  "Mental health",
  "Accessibility",
  "Open source",
  "Space",
  "Ocean conservation",
  "Financial literacy",
  "Food security",
  "Civic tech",
  "Gender equity",
];

export const SUGGESTED_MAJORS = [
  "Computer Science",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Biomedical Engineering",
  "Mathematics",
  "Physics",
  "Biology",
  "Chemistry",
  "Neuroscience",
  "Economics",
  "Business",
  "Environmental Science",
  "Design",
  "Cognitive Science",
  "Public Policy",
];
