/**
 * R/HOOD Privacy Policy — legal copy only (no React).
 * Update dates and text here; the screen stays presentational.
 */

export const privacyMeta = {
  documentTitle: "R/HOOD Privacy Policy",
  effectiveDateLine: "Effective Date: January 1, 2026",
  copyrightNotice: "© 2026 R/HOOD. All rights reserved.",
  introParagraph:
    'R/HOOD ("we," "our," "us") values your privacy. This Privacy Policy explains how we collect, use, share, and protect your personal information when you use our website, mobile app, and related services (collectively, the "Platform").',
};

export const privacyContact = {
  sectionTitle: "Contact Us",
  intro:
    "If you have any questions or concerns about this Privacy Policy, contact us at:",
  companyName: "R/HOOD",
  emailLine: "Email: hello@rhood.io",
  websiteLine: "Website: www.rhood.io",
};

/**
 * Section: { title, content?, bullets?, subsections? }
 * Subsection: { title, content?, bullets? } — omit `content` when bullets-only.
 */
export const privacySections = [
  {
    title: "1. Information We Collect",
    subsections: [
      {
        title: "1.1. Information You Provide",
        bullets: [
          "Account Information: When you create an account, we collect your name, email address, phone number, username, password, and optional profile details (bio, links, genre preferences, etc.).",
          "Professional Data: DJs and producers may choose to share music links, portfolios, social handles, or gig preferences.",
          "Payment Details: If you transact through the platform, we may collect payment or payout information (via secure third-party processors such as Stripe or PayPal).",
          "Communications: Any messages or inquiries you send through the platform or via support channels.",
        ],
      },
      {
        title: "1.2. Information We Collect Automatically",
        bullets: [
          "Usage Data: Details about how you use the Platform (pages visited, time spent, features used).",
          "Device & Log Data: IP address, browser type, device type, operating system, app version, and crash logs.",
          "Location Data: If you enable location services, we may collect approximate or precise location data to show relevant gigs, collaborators, or opportunities.",
        ],
      },
      {
        title: "1.3. Information from Third Parties",
        content: "We may receive data from integrated services such as:",
        bullets: [
          "Social media logins (e.g., Sign in with Apple, Google, or Spotify)",
          "Event platforms, promoters, or booking partners connected to your R/HOOD account.",
        ],
      },
    ],
  },
  {
    title: "2. How We Use Your Information",
    content: "We use your information to:",
    bullets: [
      "Operate, maintain, and improve the R/HOOD platform.",
      "Match you with relevant gigs, opportunities, and collaborators.",
      "Personalize your experience and show tailored recommendations.",
      "Process payments and manage bookings.",
      "Communicate updates, security alerts, or service announcements.",
      "Enforce our Terms of Service and protect user safety.",
    ],
  },
  {
    title: "3. How We Share Information",
    content:
      "We do not sell your data. We may share limited information in the following cases:",
    bullets: [
      "With Other Users: Your public profile and gig applications may be visible to promoters or collaborators.",
      "With Service Providers: Trusted partners who assist with hosting, analytics, payment processing, or communication (bound by confidentiality agreements).",
      "For Legal Reasons: To comply with applicable law, respond to lawful requests, or protect rights, property, and safety.",
      "Business Transfers: In the event of a merger, acquisition, or sale, user information may be transferred under the same privacy protections.",
    ],
  },
  {
    title: "4. Data Retention",
    content:
      "We retain personal data only as long as necessary to provide our services or comply with legal obligations. You can delete your account at any time, which will permanently remove your data (subject to any legal retention requirements).",
  },
  {
    title: "5. Your Rights",
    content: "Depending on your region, you may have the right to:",
    bullets: [
      "Access, correct, or delete your personal data.",
      "Object to or restrict certain processing.",
      "Withdraw consent at any time.",
      "Request a copy of your data in a portable format.",
    ],
  },
  {
    title: "6. Security",
    content:
      "We use industry-standard encryption, secure data storage, and access controls to protect your data. However, no online service is 100% secure, so we encourage you to use a strong password and be mindful of what you share publicly.",
  },
  {
    title: "7. Children's Privacy",
    content:
      "R/HOOD is not intended for individuals under 16. We do not knowingly collect data from minors. If you believe a child has provided personal data, contact us immediately.",
  },
  {
    title: "8. International Transfers",
    content:
      "R/HOOD operates globally. By using our Platform, you agree that your data may be transferred and processed outside your home country, subject to applicable data protection laws (e.g., GDPR, CCPA).",
  },
  {
    title: "9. Updates to This Policy",
    content:
      'We may update this Privacy Policy from time to time. The latest version will always be posted on our website or app, with the "Effective Date" updated accordingly.',
  },
];
