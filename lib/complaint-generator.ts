// Input type for complaint generation
export interface ComplaintInput {
  target: string;
  targetType?: "link" | "username";
  entityType?: "channel" | "group" | "account";
  violationType: string;
  description: string;
  evidence?: string | null;
  notes?: string | null;
  forceSenderName?: string | null;
}

// Random name list for sign-off - realistic Indian and international names
const RANDOM_NAMES = [
  "Rahul Sharma",
  "Neha Verma",
  "Amit Patel",
  "Aditya Mehra",
  "Karan Singh",
  "Priya Nair",
  "Rohan Kumar",
  "Anjali Desai",
  "Vikram Reddy",
  "Sneha Iyer",
  "Arjun Mehta",
  "Divya Joshi",
  "Rajesh Gupta",
  "Meera Kapoor",
  "Siddharth Malhotra",
  "Kavya Menon",
  "Nikhil Agarwal",
  "Shreya Rao",
  "Varun Bhatia",
  "Isha Choudhury",
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

// Clean and rewrite user text into proper English while preserving meaning
function cleanUserText(text: string): string {
  if (!text || !text.trim()) return "";
  
  // Split into sentences
  const sentences = text
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  
  if (sentences.length === 0) return "";
  
  // Capitalize first letter of each sentence and ensure proper punctuation
  const cleaned = sentences
    .map((s) => {
      let cleaned = s.trim();
      if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        if (!/[.!?]$/.test(cleaned)) {
          cleaned += ".";
        }
      }
      return cleaned;
    })
    .join(" ");
  
  return cleaned;
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

// Get issue type description for intro paragraph
function getIssueTypeDescription(issueType: string): string {
  const descriptions: Record<string, string> = {
    impersonation: "a case of impersonation",
    scam: "fraudulent and scam-related activity",
    fraud: "fraudulent and scam-related activity",
    spam: "persistent spam activity",
    harassment: "targeted harassment and harmful content",
    hate_speech: "targeted harassment and harmful content",
    sexual_content: "explicit and harmful content",
    self_harm_promotion: "content that encourages self-harm or dangerous behavior",
    copyright_violation: "unauthorized use and distribution of protected content",
    malware: "malicious software distribution and data theft attempts",
    illegal: "content that violates applicable laws and platform policies",
    other: "behavior that violates Telegram's Terms of Service",
  };
  
  return descriptions[issueType] || descriptions.other;
}

// Get detailed issue description based on type and entity type
function getIssueDetails(issueType: string, detailsText: string, entityType: "channel" | "group" | "account" = "account"): string {
  const entityWord = entityType === "channel" ? "channel" : entityType === "group" ? "group" : "account";
  let baseDescription = "";
  
  switch (issueType) {
    case "impersonation":
      baseDescription = `The ${entityWord} is pretending to be another person, brand, or service. It uses similar names, profile information, or messaging patterns to mislead users into believing it is an official or authorized ${entityWord}.`;
      break;
    case "scam":
    case "fraud":
      baseDescription = `The ${entityWord} is engaging in fraudulent activities designed to trick users into sending money, cryptocurrency, or sensitive personal information. This includes promoting fake investment schemes, cryptocurrency giveaways, or other deceptive financial scams.`;
      break;
    case "spam":
      if (entityType === "channel" || entityType === "group") {
        baseDescription = `The ${entityWord} is distributing mass unsolicited content, repeatedly promoting services or products, or sending unwanted messages to users without consent.`;
      } else {
        baseDescription = `The ${entityWord} is sending mass unsolicited messages, repeatedly promoting services or products, or sending unwanted invitations across multiple chats and groups without consent.`;
      }
      break;
    case "harassment":
    case "hate_speech":
      baseDescription = `The ${entityWord} is ${entityType === "channel" || entityType === "group" ? "publishing" : "sending"} abusive, threatening, or hateful ${entityType === "channel" || entityType === "group" ? "content" : "messages"} targeting specific individuals or groups based on protected characteristics. This behavior creates a hostile environment and violates platform safety guidelines.`;
      break;
    case "sexual_content":
      baseDescription = `The ${entityWord} is sharing explicit sexual content or material that violates Telegram's community guidelines regarding adult content distribution.`;
      break;
    case "self_harm_promotion":
      baseDescription = `The ${entityWord} is promoting or encouraging self-harm, suicide, or other dangerous behaviors that pose serious risks to user safety and mental health.`;
      break;
    case "copyright_violation":
      baseDescription = `The ${entityWord} is distributing copyrighted material without authorization, including movies, music, software, or other protected intellectual property.`;
      break;
    case "malware":
      baseDescription = `The ${entityWord} is sharing links or files that appear to deliver malicious software, steal user credentials, or compromise device security. These activities pose significant risks to user privacy and data safety.`;
      break;
    case "illegal":
      baseDescription = `The ${entityWord} is sharing content or engaging in activities that violate applicable laws and Telegram's Terms of Service, including but not limited to illegal goods, services, or prohibited content.`;
      break;
    default:
      baseDescription = `The ${entityWord} is engaging in behavior that violates Telegram's Terms of Service and community guidelines, creating risks to user safety and platform integrity.`;
  }
  
  // If user provided details, integrate them smoothly
  if (detailsText && detailsText.trim()) {
    const cleanedDetails = cleanUserText(detailsText);
    if (cleanedDetails) {
      return `${baseDescription} Specifically, ${cleanedDetails.toLowerCase()}`;
    }
  }
  
  return baseDescription;
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

// Get entity type description for natural language
function getEntityTypeDescription(entityType: "channel" | "group" | "account" | undefined): string {
  switch (entityType) {
    case "channel":
      return "channel";
    case "group":
      return "group";
    case "account":
      return "account";
    default:
      return "account";
  }
}

// Format target based on type
function formatTargetForEmail(target: string, targetType: "link" | "username" | undefined, entityType: "channel" | "group" | "account" | undefined): string {
  // If it's a link, use it as-is (or extract username if it's a simple channel link)
  if (targetType === "link" || target.includes("t.me/") || target.startsWith("http")) {
    // For channel/group links, try to extract username for cleaner display
    if (target.includes("t.me/")) {
      const match = target.match(/t\.me\/([^\/\s]+)/);
      if (match) {
        const username = match[1];
        // If it's a message link, keep the full link
        if (target.includes(`/${username}/`)) {
          return target;
        }
        // Otherwise, format as @username
        return `@${username}`;
      }
    }
    return target;
  }
  
  // For username, ensure @ prefix
  if (!target.startsWith("@")) {
    return `@${target}`;
  }
  return target;
}

export function generateComplaint(report: ComplaintInput) {
  // Parse inputs
  const targets = parseTargets(report.target);
  const targetUsername = targets[0] || report.target.trim();
  const issueType = report.violationType;
  const detailsText = [report.description, report.notes].filter((t) => t && t.trim()).join(" ").trim();
  const evidenceItems = parseEvidence(report.evidence || "");
  const forceSenderName = report.forceSenderName?.trim() || null;
  const targetType = report.targetType || (targetUsername.includes("t.me/") || targetUsername.startsWith("http") ? "link" : "username");
  const entityType = report.entityType || "account";

  // Generate subject (keep existing logic)
  const subject = generateSubject(targets, report.violationType);

  // Determine sender name
  const senderName = forceSenderName && forceSenderName.length > 0 
    ? forceSenderName 
    : getRandomName();

  // Format target for email
  const formattedTarget = formatTargetForEmail(targetUsername, targetType, entityType);
  const entityDesc = getEntityTypeDescription(entityType);

  // Get issue type description
  const issueDesc = getIssueTypeDescription(issueType);

  // Generate email body following strict structure
  let body = "Dear Telegram Support Team,\n\n";

  // Intro paragraph (1-3 sentences) - now uses entity type
  body += `I am writing to report ${issueDesc} associated with the following ${entityDesc}: ${formattedTarget}. `;
  body += `This behavior violates Telegram's Terms of Service and may require ${entityDesc} restriction or permanent ban if confirmed.`;
  if (targets.length > 1) {
    body += ` Additionally, ${targets.length - 1} other related ${entityDesc}${targets.length > 2 ? 's' : ''} ${targets.length > 2 ? 'are' : 'is'} involved in similar violations.`;
  }
  body += "\n\n";

  // Details of the issue section
  body += "Details of the issue:\n\n";
  const issueDetails = getIssueDetails(issueType, detailsText, entityType);
  body += issueDetails;
  body += "\n\n";

  // Evidence section
  body += "Evidence:\n\n";
  if (evidenceItems.length > 0) {
    body += "Below are specific items that demonstrate the behavior:\n\n";
    evidenceItems.forEach((item) => {
      body += `• ${item}\n`;
    });
  } else {
    body += "I am prepared to provide screenshots, chat logs, or additional details upon request.";
  }
  body += "\n\n";

  // Requested actions section
  body += "Requested actions:\n\n";
  body += `1. Review the reported ${entityDesc} and its related activity.\n`;
  body += "2. Verify whether this behavior violates Telegram's Terms of Service and community guidelines.\n";
  body += `3. Take appropriate enforcement action, including ${entityDesc} restriction or permanent ban, if violations are confirmed.\n`;
  body += "4. Remove or limit access to harmful, misleading, or abusive content where applicable.\n";
  body += "5. Preserve relevant data for potential legal or internal review, if needed.\n\n";

  // Closing paragraph (1-2 sentences)
  body += "I am concerned about user safety, trust, and platform integrity. I appreciate your assistance in addressing this matter promptly.\n\n";

  // Sign-off
  body += "Thank you for your time and assistance.\n\n";
  body += "Best regards,\n";
  body += senderName;

  return { subject, body };
}
