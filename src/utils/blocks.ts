import { RespondArguments } from "@slack/bolt";

export const createRephreasedEphemeralMessageBlock = (params: {
  message: string;
  tone: string;
  rephrasedMessage: string;
  threadTs?: string;
}): RespondArguments => {
  const { message, tone, rephrasedMessage, threadTs } = params;

  return {
    response_type: "ephemeral",
    thread_ts: threadTs,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Original Text:*\n${message}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Tone:*\n${tone.charAt(0).toUpperCase() + tone.slice(1)}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Rephrased Message:*\n${rephrasedMessage}`,
        },
      },
      {
        type: "section",
        block_id: "rephrase_setup_block",
        text: {
          type: "mrkdwn",
          text: "Pick a category to rephrase the sentence with:",
        },
        accessory: {
          type: "static_select",
          placeholder: {
            type: "plain_text",
            text: "Select a category",
          },
          action_id: "change_tone", // The ID we listen for
          options: [
            {
              text: { type: "plain_text", text: "Professional" },
              value: "professional",
            },
            {
              text: { type: "plain_text", text: "Casual" },
              value: "casual",
            },
            {
              text: { type: "plain_text", text: "Concise" },
              value: "concise",
            },
            {
              text: { type: "plain_text", text: "Friendly" },
              value: "friendly",
            },
            {
              text: { type: "plain_text", text: "Urgent" },
              value: "urgent",
            },
            {
              text: { type: "plain_text", text: "Enthusiastic" },
              value: "enthusiastic",
            },
            {
              text: { type: "plain_text", text: "Supportive" },
              value: "supportive",
            },
            {
              text: { type: "plain_text", text: "Motivating" },
              value: "motivating",
            },
            {
              text: { type: "plain_text", text: "Grateful" },
              value: "grateful",
            },
            {
              text: { type: "plain_text", text: "Humorous" },
              value: "humorous",
            },
          ],
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Send to Channel" },
            style: "primary",
            action_id: "send_message_to_channel",
            value: rephrasedMessage,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Cancel" },
            style: "danger",
            action_id: "delete_preview",
          },
        ],
      },
    ],
  };
};
