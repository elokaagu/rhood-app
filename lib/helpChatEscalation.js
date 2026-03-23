/**
 * Email escalation from Help Chat (edge function + mailto fallback).
 */

const SUPPORT_EMAIL = "hello@rhood.io";

/**
 * @param {{ sender: string; text: string }[]} messages
 */
export function formatHelpChatTranscript(messages) {
  return messages
    .map(
      (msg) =>
        `${msg.sender === "user" ? "You" : "Support Bot"}: ${msg.text}`
    )
    .join("\n\n");
}

/**
 * @param {object} params
 * @param {import('@supabase/supabase-js').SupabaseClient} params.supabase
 * @param {{ email?: string; id?: string; user_metadata?: object }} params.user
 * @param {{ sender: string; text: string }[]} params.messages
 * @param {(msg: object) => Promise<void>} params.persistBotMessage
 * @param {(msg: object) => void} params.appendBotMessage
 * @param {typeof import('react-native').Linking} params.Linking
 * @param {typeof import('react-native').Alert} params.Alert
 */
export async function runHelpChatEscalation({
  supabase,
  user,
  messages,
  persistBotMessage,
  appendBotMessage,
  Linking,
  Alert,
}) {
  const conversationHistory = formatHelpChatTranscript(messages);
  const userEmail = user?.email || "user@example.com";
  const userName =
    user?.user_metadata?.dj_name ||
    user?.user_metadata?.first_name ||
    "User";

  const successCopy = (email) =>
    "Great! I've sent your message to our support team. They'll get back to you at " +
    email +
    " within 24 hours.";

  const tryEdge = async () => {
    const { error } = await supabase.functions.invoke("send-email", {
      body: {
        to: SUPPORT_EMAIL,
        subject: `Support Request from ${userName}`,
        html: `
            <h2>Support Request</h2>
            <p><strong>User:</strong> ${userName} (${userEmail})</p>
            <p><strong>User ID:</strong> ${user?.id || "Unknown"}</p>
            <hr>
            <h3>Conversation History:</h3>
            <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px;">${conversationHistory}</pre>
            <hr>
            <p><em>This message was sent from the in-app help chat.</em></p>
          `,
        text: `Support Request from ${userName}\n\nUser: ${userName} (${userEmail})\nUser ID: ${
          user?.id || "Unknown"
        }\n\nConversation History:\n\n${conversationHistory}`,
      },
    });
    if (error) throw error;
  };

  try {
    await tryEdge();
    const successMessage = {
      id: Date.now().toString(),
      text: successCopy(userEmail),
      sender: "bot",
      timestamp: new Date(),
    };
    appendBotMessage(successMessage);
    await persistBotMessage(successMessage);
  } catch {
    const emailBody = `Hi R/HOOD Support,

I need help with the following issue:

${conversationHistory}

User: ${userName}
Email: ${userEmail}
User ID: ${user?.id || "Unknown"}

Thank you!`;

    const encodedSubject = encodeURIComponent(
      `Support Request from ${userName}`
    );
    const encodedBody = encodeURIComponent(emailBody);
    const mailtoLink = `mailto:${SUPPORT_EMAIL}?subject=${encodedSubject}&body=${encodedBody}`;

    Alert.alert(
      "Contact Support",
      "I'll open your email app so you can send us a message directly.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Email",
          onPress: async () => {
            try {
              const canOpen = await Linking.canOpenURL("mailto:").catch(
                () => true
              );
              if (canOpen) {
                await Linking.openURL(mailtoLink);
                const successMessage = {
                  id: Date.now().toString(),
                  text: "I've opened your email app. Please send the message and our team will respond within 24 hours.",
                  sender: "bot",
                  timestamp: new Date(),
                };
                appendBotMessage(successMessage);
                await persistBotMessage(successMessage);
              } else {
                Alert.alert(
                  "Error",
                  `Could not open email app. Please email ${SUPPORT_EMAIL} directly.`
                );
              }
            } catch {
              Alert.alert(
                "Email Support",
                `Please email us at ${SUPPORT_EMAIL} with your question. We'll respond within 24 hours.`,
                [{ text: "OK" }]
              );
            }
          },
        },
      ]
    );
  }
}
