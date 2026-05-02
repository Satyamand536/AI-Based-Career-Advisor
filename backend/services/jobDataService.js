/**
 * Job Data Service — Multi-API Tech Job Fetcher
 * ================================================
 * Integrates: Adzuna API, The Muse API, Jooble API
 * 
 * Pipeline:
 * Fetch jobs from APIs → Filter only tech jobs → Extract required skills
 * → Normalize skills → Generate embeddings → Store in MongoDB
 * 
 * CRON: runs every 6 hours
 */

const axios = require("axios");
const mongoose = require("mongoose");
const Job = require("../models/job");

// ─── Tech-only filter keywords ──────────────────────────────────────────
const TECH_KEYWORDS = [
  "software", "developer", "engineer", "programmer", "coding", "data science",
  "machine learning", "devops", "cloud", "backend", "frontend", "full stack",
  "fullstack", "react", "node", "python", "java", "typescript", "javascript",
  "mobile", "ios", "android", "flutter", "api", "microservices", "kubernetes",
  "docker", "aws", "azure", "gcp", "database", "sql", "mongodb", "architect",
  "cybersecurity", "security", "sre", "platform", "infrastructure", "ai", "ml",
  "nlp", "computer vision", "blockchain", "system", "technical", "automation",
  "analyst", "qa", "testing", "network", "embedded", "firmware", "hadoop",
  "spark", "airflow", "bi", "etl", "scala", "kotlin", "swift", "rust", "go",
  "golang", "php", "rails", "django", "flask", "spring", "angular", "vue",
  "next.js", "graphql", "linux", "unix", "bash", "terraform", "ansible",
  "jenkins", "ci/cd", "scrum", "agile", "product", "technical lead",
];

// ─── Skill extraction from job description ──────────────────────────────
const KNOWN_SKILLS = [
  "React","React Native","Vue","Angular","Next.js","Gatsby","Svelte",
  "Node.js","Express","Django","Flask","FastAPI","Spring Boot","Rails",
  "Laravel","GraphQL","REST API","gRPC","WebSocket",
  "Python","JavaScript","TypeScript","Java","C++","C#","Go","Kotlin",
  "Swift","Rust","Ruby","PHP","Scala",
  "MongoDB","PostgreSQL","MySQL","Redis","Elasticsearch","DynamoDB",
  "Cassandra","Firebase","Neo4j","SQLite",
  "AWS","GCP","Azure","Azure DevOps","Docker","Kubernetes","Terraform",
  "Ansible","Jenkins","GitHub Actions","CI/CD","Linux",
  "TensorFlow","PyTorch","scikit-learn","pandas","NumPy","OpenAI API",
  "LangChain","Hugging Face","Spark","Hadoop","Airflow","Tableau",
  "Machine Learning","Deep Learning","NLP","Computer Vision",
  "Git","SQL","NoSQL","Microservices","Agile","Scrum","System Design",
  "HTML","CSS","Tailwind CSS","Bootstrap","Webpack","Redux",
  "React Native","Flutter","iOS","Android","Xcode",
  "Cybersecurity","Penetration Testing","OAuth","JWT","Nginx",
];

function extractSkillsFromText(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return KNOWN_SKILLS.filter(skill => lower.includes(skill.toLowerCase()));
}

const NON_TECH_KEYWORDS = [
  "visual designer", "graphic designer", "ui designer", "ux designer",
  "illustrator", "animator", "video editor", "content writer", "copywriter",
  "marketing", "sales", "hr manager", "recruiter"
];

function isTechJob(title = "", description = "") {
  const combined = (title + " " + description).toLowerCase();
  
  // Exclude non-tech creative/business roles
  if (NON_TECH_KEYWORDS.some(kw => combined.includes(kw))) {
    return false;
  }
  
  return TECH_KEYWORDS.some(kw => combined.includes(kw));
}

function normalizeSkills(skills) {
  return [...new Set(skills.map(s => s.trim()).filter(Boolean))];
}

// ─── API 1: Adzuna ──────────────────────────────────────────────────────
async function fetchFromAdzuna(limit = 50) {
  const APP_ID  = process.env.ADZUNA_APP_ID;
  const API_KEY = process.env.ADZUNA_API_KEY;

  if (!APP_ID || !API_KEY) {
    console.warn("[JobFetcher] Adzuna keys not set — skipping");
    return [];
  }

  const queries = [
    "software engineer", "frontend developer", "backend developer",
    "full stack developer", "DevOps engineer", "data engineer",
    "machine learning engineer", "python developer", "react developer",
  ];

  const results = [];
  for (const q of queries.slice(0, 3)) {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1`;
      const res = await axios.get(url, {
        params: {
          app_id: APP_ID,
          app_key: API_KEY,
          results_per_page: Math.ceil(limit / 3),
          what: q,
          content_type: "application/json",
          sort_by: "date",
        },
        timeout: 15000,
      });

      const jobs = (res.data?.results || []).map(job => ({
        title: job.title || "",
        company: job.company?.display_name || "Unknown",
        description: job.description || "",
        location: job.location?.display_name || "Remote",
        type: "Full-time",
        source_link: job.redirect_url || "",
        source: "adzuna",
        salary_min: job.salary_min || null,
        salary_max: job.salary_max || null,
      }));
      results.push(...jobs);
    } catch (err) {
      console.error(`[JobFetcher] Adzuna error for "${q}":`, err.message);
    }
  }
  return results;
}

// ─── API 2: The Muse ────────────────────────────────────────────────────
async function fetchFromTheMuse(limit = 50) {
  const API_KEY = process.env.THE_MUSE_API_KEY;
  const categories = [
    "Software Engineer","Data Science","DevOps","Backend","Frontend",
    "Full Stack","Data Engineering","Machine Learning","Mobile"
  ];

  const results = [];
  for (const cat of categories.slice(0, 4)) {
    try {
      const params = { category: cat, page: 1, api_key: API_KEY };
      if (!API_KEY) delete params.api_key; // The Muse allows unauthenticated (rate limited)

      const res = await axios.get("https://www.themuse.com/api/public/jobs", {
        params,
        timeout: 15000,
      });

      const jobs = (res.data?.results || []).map(job => ({
        title: job.name || "",
        company: job.company?.name || "Unknown",
        description: job.contents || "",
        location: job.locations?.[0]?.name || "Remote",
        type: "Full-time",
        source_link: job.refs?.landing_page || "",
        source: "themuse",
      }));
      results.push(...jobs);
    } catch (err) {
      console.error(`[JobFetcher] The Muse error for "${cat}":`, err.message);
    }
  }
  return results;
}

// ─── API 3: Jooble ──────────────────────────────────────────────────────
async function fetchFromJooble(limit = 50) {
  const API_KEY = process.env.JOOBLE_API_KEY;
  if (!API_KEY) {
    console.warn("[JobFetcher] Jooble key not set — skipping");
    return [];
  }

  const queries = ["software developer", "machine learning engineer", "DevOps"];
  const results = [];

  for (const q of queries) {
    try {
      const res = await axios.post(
        `https://jooble.org/api/${API_KEY}`,
        { keywords: q, location: "", onlyRemote: false },
        { timeout: 15000 }
      );
      const jobs = (res.data?.jobs || []).map(job => ({
        title: job.title || "",
        company: job.company || "Unknown",
        description: job.snippet || "",
        location: job.location || "Remote",
        type: "Full-time",
        source_link: job.link || "",
        source: "jooble",
      }));
      results.push(...jobs);
    } catch (err) {
      console.error(`[JobFetcher] Jooble error for "${q}":`, err.message);
    }
  }
  return results;
}

// ─── Main ingestion pipeline ─────────────────────────────────────────────
async function runJobIngestion() {
  console.log("🔄 [JobFetcher] Starting job ingestion pipeline...");

  // 1. Fetch from all APIs in parallel
  const [adzunaJobs, museJobs, joobleJobs] = await Promise.allSettled([
    fetchFromAdzuna(60),
    fetchFromTheMuse(60),
    fetchFromJooble(30),
  ]);

  const all = [
    ...(adzunaJobs.status === "fulfilled" ? adzunaJobs.value : []),
    ...(museJobs.status === "fulfilled"   ? museJobs.value   : []),
    ...(joobleJobs.status === "fulfilled" ? joobleJobs.value : []),
  ];

  console.log(`📋 [JobFetcher] Raw fetched: ${all.length} jobs`);

  // 2. Filter only tech jobs
  const techJobs = all.filter(j => isTechJob(j.title, j.description));
  console.log(`✅ [JobFetcher] Tech jobs after filter: ${techJobs.length}`);

  // 3. Process each job
  let saved = 0;
  let skipped = 0;

  for (const raw of techJobs) {
    try {
      // Dedup by title+company
      const existing = await Job.findOne({
        title: new RegExp(`^${raw.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i"),
        company: new RegExp(`^${raw.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i"),
      });

      if (existing) { skipped++; continue; }

      // Extract skills from title + description
      const rawSkills = extractSkillsFromText(raw.title + " " + raw.description);
      const skills = normalizeSkills(rawSkills);

      // Determine category  
      const cat = categorizeJob(raw.title);

      const doc = new Job({
        title: raw.title,
        company: raw.company,
        description: raw.description.slice(0, 2000), // Limit desc length
        location: raw.location || "Remote",
        type: raw.type || "Full-time",
        required_skills: skills,
        category: cat,
        source_link: raw.source_link,
        experience_required: estimateExperienceRequired(raw.description),
        // embeddings will be generated by Python AI service separately
      });

      await doc.save();
      saved++;
    } catch (err) {
      console.error("[JobFetcher] Save error:", err.message);
    }
  }

  console.log(`🎉 [JobFetcher] Done: ${saved} saved, ${skipped} skipped (duplicates)`);

  // 4. Request embeddings from AI service
  try {
    await axios.post(`${process.env.AI_SERVICE_URL || "http://127.0.0.1:5001"}/api/generate-embeddings`, {
      regenerate_all: false,
    }, { timeout: 30000 });
    console.log("⚡ [JobFetcher] Embedding generation triggered");
  } catch (err) {
    console.warn("[JobFetcher] Embedding trigger failed (AI service may be busy):", err.message);
  }

  return { saved, skipped, total: all.length, tech: techJobs.length };
}

function categorizeJob(title = "") {
  const t = title.toLowerCase();
  if (t.includes("frontend") || t.includes("react") || t.includes("vue") || t.includes("angular")) return "Frontend";
  if (t.includes("backend") || t.includes("node") || t.includes("django") || t.includes("api")) return "Backend";
  if (t.includes("full stack") || t.includes("fullstack") || t.includes("mern") || t.includes("mean")) return "Full Stack";
  if (t.includes("devops") || t.includes("cloud") || t.includes("sre") || t.includes("infrastructure")) return "DevOps";
  if (t.includes("data scientist") || t.includes("machine learning") || t.includes("ai engineer")) return "AI/ML";
  if (t.includes("data engineer") || t.includes("etl") || t.includes("pipeline")) return "Data Engineering";
  if (t.includes("mobile") || t.includes("ios") || t.includes("android") || t.includes("flutter")) return "Mobile";
  if (t.includes("security") || t.includes("cyber")) return "Security";
  if (t.includes("qa") || t.includes("test") || t.includes("quality")) return "QA";
  return "Software Engineering";
}

function estimateExperienceRequired(description = "") {
  const match = description.match(/(\d+)\+?\s*years?\s*(of\s+)?experience/i);
  if (match) return Math.min(parseInt(match[1]), 20);
  if (/senior|lead|principal|staff/i.test(description)) return 5;
  if (/mid|intermediate/i.test(description)) return 3;
  if (/junior|entry|graduate|fresher/i.test(description)) return 0;
  return 2;
}

module.exports = { runJobIngestion, extractSkillsFromText, isTechJob };
