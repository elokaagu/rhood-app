/**
 * Rule-based replies when AI is unavailable or returns an error.
 * Ordered: first matching rule wins.
 */

const DEFAULT_REPLY = {
  category: "general",
  shouldEscalate: false,
  priority: "normal",
  text:
    "Got it! I'm here to help you figure this out. Can you tell me a bit more about what's going on?\n\n" +
    "For example:\n" +
    "• What are you trying to do?\n" +
    "• What happens when you try?\n" +
    "• Are you seeing any error messages?\n\n" +
    "The more details you give me, the better I can help you solve it!",
  quickActions: [
    { text: "Upload issues", action: "upload" },
    { text: "Location issues", action: "location" },
    { text: "Account problems", action: "account" },
    { text: "Contact support", action: "escalate" },
  ],
};

/** @type {{ category: string; shouldEscalate?: boolean; priority?: "normal" | "high"; keywords: string[]; response: { category: string; shouldEscalate: boolean; priority: "normal" | "high"; text: string; quickActions: { text: string; action: string }[] } }[]} */
const RULES = [
  {
    category: "upload",
    shouldEscalate: false,
    priority: "normal",
    keywords: [
      "upload",
      "mix upload",
      "file upload",
      "can't upload",
      "cannot upload",
      "upload error",
      "upload issue",
      "uploading failed",
      "upload failed",
    ],
    response: {
      category: "upload",
      shouldEscalate: false,
      priority: "normal",
      text:
        "Got it! Let's figure out your upload issue. Can you tell me:\n\n" +
        "• What happens when you try to upload? Does it fail immediately, or get stuck?\n" +
        "• What format is your file? (MP3, WAV, etc.)\n" +
        "• How big is the file? (Max is 500MB)\n" +
        "• Are you seeing any error messages?\n\n" +
        "Once I know these details, I can give you the exact fix!",
      quickActions: [
        { text: "File too large", action: "file-size" },
        { text: "Upload keeps failing", action: "upload-failing" },
        { text: "Contact support", action: "escalate" },
      ],
    },
  },
  {
    category: "location",
    shouldEscalate: false,
    priority: "normal",
    keywords: [
      "location",
      "wrong location",
      "wrong city",
      "can't change location",
      "cannot change location",
      "location not working",
      "location won't save",
      "can't find my city",
    ],
    response: {
      category: "location",
      shouldEscalate: false,
      priority: "normal",
      text:
        "Ah, location issues can be annoying! Let me help you fix this. What's happening exactly?\n\n" +
        "• Is your city not showing up in the list?\n" +
        "• Or does it not save when you try to update it?\n" +
        "• Is it showing the wrong location?\n\n" +
        "Tell me which one and I'll walk you through the fix step by step!",
      quickActions: [
        { text: "Can't find my city", action: "city-not-found" },
        { text: "Location won't save", action: "location-save" },
        { text: "Contact support", action: "escalate" },
      ],
    },
  },
  {
    category: "account",
    shouldEscalate: false,
    priority: "normal",
    keywords: [
      "account",
      "login",
      "log in",
      "sign in",
      "can't log in",
      "cannot log in",
      "password",
      "forgot password",
      "reset password",
    ],
    response: {
      category: "account",
      shouldEscalate: false,
      priority: "normal",
      text:
        "Got it! Let's sort out your account issue. What's happening?\n\n" +
        "• Can't log in? Are you getting an error message?\n" +
        "• Forgot your password? I can walk you through resetting it\n" +
        "• Need to change account settings? I'll show you where to go\n\n" +
        "Tell me which one and I'll guide you through it!",
      quickActions: [
        { text: "Can't log in", action: "login-issue" },
        { text: "Forgot password", action: "password-reset" },
        { text: "Contact support", action: "escalate" },
      ],
    },
  },
  {
    category: "billing",
    shouldEscalate: true,
    priority: "high",
    keywords: [
      "charged",
      "charge",
      "billing",
      "payment issue",
      "refund",
      "invoice",
      "subscription",
    ],
    response: {
      category: "billing",
      shouldEscalate: true,
      priority: "high",
      text:
        "Thanks for flagging this. Billing/payment issues are best handled directly by support so we can review your account securely.\n\n" +
        "Tap below and we'll help you contact support right away.",
      quickActions: [{ text: "Contact support", action: "escalate" }],
    },
  },
  {
    category: "stability",
    shouldEscalate: true,
    priority: "high",
    keywords: ["crash", "crashes", "app keeps closing", "frozen", "won't open", "not opening"],
    response: {
      category: "stability",
      shouldEscalate: true,
      priority: "high",
      text:
        "Sorry you're hitting stability issues. Let's get this escalated so the team can investigate quickly.\n\n" +
        "Tap below to contact support with your chat history attached.",
      quickActions: [{ text: "Contact support", action: "escalate" }],
    },
  },
];

/**
 * @param {string} userMessage
 * @returns {{ category: string; shouldEscalate: boolean; priority: "normal" | "high"; text: string; quickActions: { text: string; action: string }[] }}
 */
export function getHelpChatRuleBasedReply(userMessage) {
  const lower = (userMessage || "").toLowerCase().trim();
  for (const rule of RULES) {
    const hit = rule.keywords.some((k) => lower.includes(k));
    if (hit) return rule.response;
  }
  return DEFAULT_REPLY;
}

/** Maps quick-action chips to a user message (escalate handled in UI). */
export const QUICK_ACTION_USER_MESSAGES = {
  upload: "I'm having trouble uploading a mix",
  location: "I'm having trouble with my location",
  account: "I'm having trouble with my account",
  escalate: "I need help from support",
  "file-size": "My file is too large to upload",
  "upload-failing": "My upload keeps failing",
  "city-not-found": "I can't find my city in the location list",
  "location-save": "My location won't save",
  "login-issue": "I can't log into my account",
  "password-reset": "I need to reset my password",
  general: "I have a general question",
};
