/**
 * Heuristic matching score for an Application.
 *
 * Score breakdown (0..100):
 *  - 70 pts — skill overlap (% of job's requiredSkills matched on
 *             the candidate's skills list, case-insensitive).
 *  - 30 pts — experience fit (in-range = full credit, off-by-1y at
 *             either side = half, otherwise 0). If the job doesn't
 *             specify min/max OR the candidate has no yearsOfExperience,
 *             skip this component entirely (renormalize to 100).
 *
 * Pure function — no DB side effects. Callers persist the result.
 *
 * The breakdown shape mirrors what the FE renders in the tooltip.
 */

export interface MatchInput {
  job: {
    requiredSkills: string[];
    experienceMin: number | null;
    experienceMax: number | null;
  };
  candidate: {
    skills: string[];
    yearsOfExperience: number | null;
  };
}

export interface MatchResult {
  score: number;
  breakdown: {
    skillsMatched: string[];
    skillsMissing: string[];
    skillScore: number;
    experienceScore: number | null;
    /** True when experience couldn't be evaluated (job or candidate
     *  didn't supply enough info). UI hides the component in this case. */
    experienceSkipped: boolean;
  };
}

const SKILL_WEIGHT = 70;
const EXPERIENCE_WEIGHT = 30;

export function computeMatch(input: MatchInput): MatchResult {
  const requiredNormalized = input.job.requiredSkills
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  const candidateNormalized = new Set(
    input.candidate.skills.map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0),
  );

  let skillsMatched: string[] = [];
  let skillsMissing: string[] = [];
  let skillScore = 0;
  if (requiredNormalized.length === 0) {
    // No required skills set on job → give full credit (the recruiter
    // hasn't told us what matters yet).
    skillScore = SKILL_WEIGHT;
  } else {
    for (const skill of input.job.requiredSkills) {
      const isMatch = candidateNormalized.has(skill.trim().toLowerCase());
      if (isMatch) skillsMatched.push(skill);
      else skillsMissing.push(skill);
    }
    skillScore = Math.round((skillsMatched.length / requiredNormalized.length) * SKILL_WEIGHT);
  }

  let experienceScore: number | null = null;
  let experienceSkipped = false;
  const yoe = input.candidate.yearsOfExperience;
  const min = input.job.experienceMin;
  const max = input.job.experienceMax;
  if (yoe === null || (min === null && max === null)) {
    experienceSkipped = true;
  } else {
    const lower = min ?? 0;
    const upper = max ?? Infinity;
    if (yoe >= lower && yoe <= upper) {
      experienceScore = EXPERIENCE_WEIGHT;
    } else if (
      (min !== null && Math.abs(yoe - min) <= 1) ||
      (max !== null && Math.abs(yoe - max) <= 1)
    ) {
      experienceScore = Math.round(EXPERIENCE_WEIGHT * 0.5);
    } else {
      experienceScore = 0;
    }
  }

  let score: number;
  if (experienceSkipped) {
    // Renormalize: skill score becomes the entire 100.
    score = Math.round((skillScore / SKILL_WEIGHT) * 100);
  } else {
    score = skillScore + (experienceScore ?? 0);
  }
  // Clamp defensively (rounding could push past 100 in edge cases).
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return {
    score,
    breakdown: {
      skillsMatched,
      skillsMissing,
      skillScore,
      experienceScore,
      experienceSkipped,
    },
  };
}
