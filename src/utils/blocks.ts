import { BlockAction, RespondArguments } from "@slack/bolt";

export const toneDropdownElement = {
  type: "input",
  block_id: "tone_selection",
  label: { type: "plain_text", text: "Target Tone" },
  element: {
    type: "static_select",
    placeholder: {
      type: "plain_text",
      text: "Pick a tone",
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
};

export const createRephreasedEphemeralMessageBlock = (params: {
  message: string;
  tone: string;
  rephrasedMessage: string;
}): RespondArguments => {
  const { message, tone, rephrasedMessage } = params;

  const actionButtons = [
    {
      type: "button" as const,
      text: { type: "plain_text" as const, text: "Cancel" },
      style: "danger" as const,
      action_id: "delete_preview",
    },
  ];
  if (rephrasedMessage.length > 0) {
    actionButtons.push({
      type: "button" as const,
      text: { type: "plain_text" as const, text: "Send to Channel" },
      // @ts-ignore
      style: "primary" as const,
      action_id: "send_message_to_channel",
      value: rephrasedMessage,
    });
  }

  return {
    response_type: "ephemeral",
    metadata: {
      event_type: "rephrase_preview",
      event_payload: {
        original_message: message,
      },
    },
    blocks: [
      {
        type: "input",
        block_id: "original_message_block",
        label: { type: "plain_text", text: "Original Message" },
        element: {
          type: "plain_text_input",
          action_id: "original_message_input",
          initial_value: message,
          multiline: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Preview:*\n${
            message.length > 0 ? message : "_Nothing to preview_"
          }`,
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
          text: `*Rephrased Message:*\n${
            rephrasedMessage.length > 0
              ? rephrasedMessage
              : "_No rephrased message generated_"
          }`,
        },
      },
      toneDropdownElement,
      {
        type: "actions",
        elements: actionButtons,
      },
    ],
  };
};

export const shortcutModalBlock = {
  type: "modal" as const,
  callback_id: "rephrase_modal_submit",
  title: {
    type: "plain_text" as const,
    text: "ProPhrase",
  },
  blocks: [
    {
      type: "input" as const,
      block_id: "input_block_id", // ID used to find this block later
      element: {
        type: "plain_text_input" as const,
        action_id: "user_message_action", // ID used to find the value
        multiline: true, // <--- THIS turns a text box into a TEXTAREA
        placeholder: {
          type: "plain_text" as const,
          text: "Paste your rough draft here...",
        },
      },
      label: {
        type: "plain_text" as const,
        text: "Message Draft",
      },
    },
    toneDropdownElement,
  ],
  submit: {
    type: "plain_text" as const,
    text: "Rephrase",
  },
};
