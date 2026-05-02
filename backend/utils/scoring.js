/**
 * Scoring utilities for job recommendations
 * Implements cosine similarity, skill matching, and experience scoring
 */

/**
 * Compute cosine similarity between two vectors
 * @param {number[]} vecA - First vector (e.g., profile embedding)
 * @param {number[]} vecB - Second vector (e.g., job embedding)
 * @returns {number} Similarity score between 0 and 1
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }
  
  if (vecA.length !== vecB.length) {
    console.warn(`Vector length mismatch: ${vecA.length} vs ${vecB.length}`);
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Compute skill match percentage
 * @param {string[]} profileSkills - User's skills from profile
 * @param {string[]} jobSkills - Required skills for the job
 * @returns {number} Match score between 0 and 1
 */
function computeSkillMatch(profileSkills, jobSkills) {
  if (!jobSkills || jobSkills.length === 0) {
    return 0.5; // Neutral score if no skills required
  }

  if (!profileSkills || profileSkills.length === 0) {
    return 0;
  }

  // Normalize skills to lowercase for comparison
  const normalizedProfileSkills = profileSkills.map(s => s.toLowerCase().trim());
  const normalizedJobSkills = jobSkills.map(s => s.toLowerCase().trim());

  const matchedSkills = normalizedJobSkills.filter(skill =>
    normalizedProfileSkills.includes(skill)
  );

  return matchedSkills.length / normalizedJobSkills.length;
}

/**
 * Compute experience score
 * @param {number} profileYears - User's years of experience
 * @param {number} requiredYears - Job's required years of experience
 * @returns {number} Score between 0 and 1
 */
function computeExperienceScore(profileYears, requiredYears) {
  if (!requiredYears || requiredYears === 0) {
    return 1; // No experience requirement
  }

  if (!profileYears || profileYears === 0) {
    return 0.3; // Some minimum score for fresh graduates
  }

  // If profile experience >= required, full score
  if (profileYears >= requiredYears) {
    return 1;
  }

  // Partial score based on how close they are
  return Math.max(0.3, profileYears / requiredYears);
}

/**
 * Build human-readable reason for the match
 * @param {object} profile - User profile
 * @param {object} job - Job object
 * @param {number} skillMatchScore - Skill match score (0-1)
 * @param {number} expScore - Experience score (0-1)
 * @returns {string} Human-readable reason
 */
function buildReason(profile, job, skillMatchScore, expScore) {
  const reasons = [];

  // Skill match reasoning
  if (skillMatchScore >= 0.7) {
    const matchedSkills = job.requiredSkills.filter(skill =>
      profile.skills.map(s => s.toLowerCase()).includes(skill.toLowerCase())
    );
    reasons.push(`Strong skill match (${matchedSkills.slice(0, 3).join(", ")})`);
  } else if (skillMatchScore >= 0.4) {
    reasons.push("Some relevant skills match");
  } else {
    reasons.push("Transferable skills applicable");
  }

  // Experience reasoning
  if (expScore >= 0.9) {
    reasons.push(`experience meets requirements (${profile.experience_years}+ years)`);
  } else if (expScore >= 0.6) {
    reasons.push(`close to required experience (${profile.experience_years} years)`);
  } else if (profile.experience_years === 0) {
    reasons.push("entry-level opportunity");
  }

  return reasons.join(" and ");
}

/**
 * Build detailed explainability object
 * @param {object} profile - User profile
 * @param {object} job - Job object
 * @param {number} embeddingSim - Embedding similarity (0-1)
 * @param {number} skillMatchScore - Skill match score (0-1)
 * @param {number} expScore - Experience score (0-1)
 * @returns {object} Explainability object
 */
function buildExplainability(profile, job, embeddingSim, skillMatchScore, expScore) {
  // Find matched skills with weights
  const normalizedProfileSkills = (profile.skills || []).map(s => s.toLowerCase());
  const normalizedJobSkills = (job.requiredSkills || []).map(s => s.toLowerCase());

  const matchedSkills = normalizedJobSkills
    .filter(skill => normalizedProfileSkills.includes(skill))
    .map(skill => ({
      skill: skill,
      weight: 1 / normalizedJobSkills.length, // Equal weight for simplicity
    }));

  return {
    skill_matches: matchedSkills,
    embedding_similarity: Math.round(embeddingSim * 100) / 100,
    experience_score: Math.round(expScore * 100) / 100,
  };
}

module.exports = {
  cosineSimilarity,
  computeSkillMatch,
  computeExperienceScore,
  buildReason,
  buildExplainability,
};
