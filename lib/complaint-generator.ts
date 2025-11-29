import type { AppReport } from "./storage-supabase";
type Report = Omit<AppReport, "id" | "createdAt" | "status" | "emailSentAt" | "bannedAt" | "lastChecked">;

// Random name list for sign-off
const RANDOM_NAMES = [
  "John Doe",
  "Neeraj Gupta",
  "Amit Verma",
  "Ravi Kumar",
  "Jennifer Lee",
  "Sarah Mitchell",
  "Rahul Sharma",
  "Daniel Reed",
  "Arjun Mehta",
  "Simran Kaur",
  "Michael Carter",
  "Sofia Williams",
  "Rohan Singh",
  "Emily Parker",
  "Anuj Tiwari",
  "Olivia Turner",
  "Jason Patel",
  "Aditya Raj",
  "Priya Nair",
  "Robert Hayes",
];

// Get random name
function getRandomName(): string {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

// Parse targets - handle multiple targets separated by newlines or commas
function parseTargets(target: string): string[] {
  return target
    .split(/[\n,]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

// Extract legal references from text (looks for patterns like "IPC 420", "IT Act 66C", etc.)
function extractLegalReferences(text: string): string[] {
  const legalPatterns = [
    /(?:IPC|Indian Penal Code|Information Technology Act|IT Act|Section)\s+\d+[A-Z]?/gi,
    /(?:Act|Law|Code|Section)\s+\d+[A-Z]?/gi,
    /\d+\s+(?:of|under)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/gi,
  ];

  const references: string[] = [];
  const found = new Set<string>();

  for (const pattern of legalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        const cleaned = match.trim();
        if (cleaned && !found.has(cleaned.toLowerCase())) {
          found.add(cleaned.toLowerCase());
          references.push(cleaned);
        }
      });
    }
  }

  return references;
}

// Extract key harmful activities from report text (3-8 bullet points)
function extractHarmfulActivities(reportText: string): string[] {
  // Split by sentences and look for action verbs or key phrases
  const sentences = reportText
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  const activities: string[] = [];
  const activityKeywords = [
    "selling",
    "distributing",
    "providing",
    "offering",
    "promoting",
    "facilitating",
    "targeting",
    "scamming",
    "defrauding",
    "stealing",
    "hacking",
    "phishing",
    "spoofing",
    "violating",
    "threatening",
    "harassing",
  ];

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (activityKeywords.some((keyword) => lowerSentence.includes(keyword))) {
      // Clean up the sentence
      let activity = sentence.trim();
      // Remove leading capitalization issues
      if (activity.length > 0) {
        activity = activity.charAt(0).toUpperCase() + activity.slice(1);
      }
      // Ensure it ends properly
      if (!/[.!?]$/.test(activity)) {
        activity += ".";
      }
      activities.push(activity);
    }
  }

  // If we don't have enough, create from key phrases
  if (activities.length < 3) {
    const phrases = reportText
      .split(/[,;]\s+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 15 && p.length < 200);

    for (const phrase of phrases) {
      if (activities.length >= 8) break;
      if (!activities.some((a) => a.toLowerCase().includes(phrase.toLowerCase().substring(0, 20)))) {
        let activity = phrase.trim();
        if (activity.length > 0) {
          activity = activity.charAt(0).toUpperCase() + activity.slice(1);
        }
        if (!/[.!?]$/.test(activity)) {
          activity += ".";
        }
        activities.push(activity);
      }
    }
  }

  // Ensure we have at least 3 and at most 8
  if (activities.length < 3) {
    // Fallback: split description into meaningful chunks
    const chunks = reportText.split(/[.!?]\s+/).filter((c) => c.trim().length > 20);
    activities.push(...chunks.slice(0, Math.min(8 - activities.length, chunks.length)));
  }

  return activities.slice(0, 8);
}

// Create summary paragraphs from report text
function createSummary(reportText: string): string {
  const sentences = reportText
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length <= 3) {
    // Short text - return as is with proper formatting
    return sentences.join(". ") + (sentences.length > 0 && !sentences[sentences.length - 1].endsWith(".") ? "." : "");
  }

  // Create 1-3 paragraphs
  const firstParagraph = sentences.slice(0, Math.ceil(sentences.length / 3)).join(". ");
  const secondParagraph =
    sentences.length > 3
      ? sentences.slice(Math.ceil(sentences.length / 3), Math.ceil((sentences.length * 2) / 3)).join(". ")
      : "";
  const thirdParagraph =
    sentences.length > 6 ? sentences.slice(Math.ceil((sentences.length * 2) / 3)).join(". ") : "";

  let summary = firstParagraph;
  if (!summary.endsWith(".")) summary += ".";

  if (secondParagraph) {
    summary += "\n\n" + secondParagraph;
    if (!secondParagraph.endsWith(".")) summary += ".";
  }

  if (thirdParagraph) {
    summary += "\n\n" + thirdParagraph;
    if (!thirdParagraph.endsWith(".")) summary += ".";
  }

  return summary;
}

// Parse evidence - handle newlines, commas, or "none"
function parseEvidence(evidence: string): string[] {
  if (!evidence || evidence.trim().toLowerCase() === "none") {
    return [];
  }

  return evidence
    .split(/[\n,]/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.toLowerCase() !== "none");
}

// Predefined subjects based on violation type
const violationSubjects: Record<string, string> = {
  scam: "scam",
  illegal: "sharing illegal content",
  impersonation: "impersonation",
  spam: "spam and malware distribution",
  other: "violation of Telegram Terms of Service",
};

// Get violation description for subject
function getViolationDescription(violationType: string): string {
  return violationSubjects[violationType] || "violation of Telegram Terms of Service";
}

// Generate subject based on violation type and first target
function generateSubject(targets: string[], violationType: string): string {
  const violationDesc = getViolationDescription(violationType);
  
  // Get first target and extract username
  const firstTarget = targets[0] || "";
  let username = firstTarget;
  
  // Extract username from link
  if (firstTarget.includes("t.me/")) {
    const match = firstTarget.match(/t\.me\/([^\/]+)/);
    username = match ? `@${match[1]}` : firstTarget;
  } else if (!firstTarget.startsWith("@")) {
    username = `@${firstTarget}`;
  }
  
  // If multiple targets, use first one in subject
  if (targets.length > 1) {
    return `URGENT: ${username} and ${targets.length - 1} other(s) are doing ${violationDesc}`;
  }
  
  return `URGENT: ${username} is doing ${violationDesc}`;
}

export function generateComplaint(report: Omit<Report, "id" | "createdAt" | "status" | "emailSentAt" | "bannedAt">) {
  // Parse inputs first
  const targets = parseTargets(report.target);
  const reportText = [report.description, report.notes].filter((t) => t && t.trim()).join(" ").trim();
  const evidence = parseEvidence(report.evidence || "");

  // Generate dynamic subject based on violation type
  const subject = generateSubject(targets, report.violationType);

  // Extract components
  const legalReferences = extractLegalReferences(reportText);
  const harmfulActivities = extractHarmfulActivities(reportText);
  const summary = createSummary(reportText);

  // Generate email body
  let body = "Dear Telegram Support Team,\n\n";

  // Introduction
  body += "I am writing to report serious illegal and harmful activity occurring on the following Telegram channels, users, or message links:\n\n";

  // List targets
  targets.forEach((target) => {
    body += `• ${target}\n`;
  });
  body += "\n";

  // Summary of Issue
  body += "SUMMARY OF ISSUE:\n\n";
  body += summary + "\n\n";

  // Key Harmful Activities
  if (harmfulActivities.length > 0) {
    body += "KEY HARMFUL ACTIVITIES:\n\n";
    harmfulActivities.forEach((activity) => {
      body += `• ${activity}\n`;
    });
    body += "\n";
  }

  // Legal & Policy References
  if (legalReferences.length > 0) {
    body += "LEGAL & POLICY REFERENCES:\n\n";
    body += "Legal & Policy References (as reported):\n\n";
    legalReferences.forEach((ref) => {
      body += `• ${ref}\n`;
    });
    body += "\n";
  }

  // Evidence
  if (evidence.length > 0) {
    body += "EVIDENCE:\n\n";
    body += "Evidence for Review:\n\n";
    evidence.forEach((link) => {
      body += `• ${link}\n`;
    });
    body += "\n";
  }

  // Requested Actions (always included)
  body += "REQUESTED ACTIONS:\n\n";
  body += "Requested Actions:\n\n";
  body += "1. Investigate the reported channels, users, and content.\n";
  body += "2. Remove any content violating Telegram Terms or applicable laws.\n";
  body += "3. Take enforcement action against involved accounts if confirmed.\n";
  body += "4. Preserve digital evidence for law enforcement authorities.\n\n";

  // Closing
  body += "This situation presents a significant risk to public safety and platform integrity. I request urgent review and action.\n\n";
  body += "Thank you for your prompt attention.\n\n";

  // Sign-off with random name
  const randomName = getRandomName();
  body += "Best regards,\n";
  body += randomName;

  return { subject, body };
}
