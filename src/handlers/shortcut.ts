import { App, StringIndexed } from "@slack/bolt";
import { shortcutModalBlock } from "../utils";
import { DEFAULT_TONE } from "../constants";
import { getOllamaChatResponse } from "../config";

export const registerShortcutHandlers = (app: App<StringIndexed>) => {
  app.shortcut("rephrase_message", async ({ shortcut, ack, client }) => {
    await ack();

    const contextData = {
      // @ts-ignore
      channel_id: shortcut?.channel?.id ?? null,
      // @ts-ignore
      thread_ts: (shortcut?.message?.thread_ts || shortcut?.message.ts) ?? null,
    };

    await client.views.open({
      trigger_id: shortcut.trigger_id,
      view: {
        ...shortcutModalBlock,
        private_metadata: JSON.stringify(contextData),
      },
    });
  });

  app.view("rephrase_modal_submit", async ({ ack, body, view, client }) => {
    const userDraft =
      view?.state?.values?.input_block_id?.user_message_action?.value ?? "";
    const selectedTone =
      view?.state?.values?.tone_selection?.change_tone?.selected_option
        ?.value ?? DEFAULT_TONE;

    // ⚠️ FAST API CHECK: Slack requires a response within 3 seconds.
    const modelResponse = await getOllamaChatResponse({
      message: userDraft,
      tone: selectedTone,
    });
    const rephrasedMessage = modelResponse?.message?.content?.trim() || "";
    const metadataString = JSON.stringify({
      ...JSON.parse(view?.private_metadata),
      rephrasedMessage,
    });

    await ack({
      response_action: "update",
      view: {
        type: "modal",
        callback_id: "final_post_action",
        title: { type: "plain_text", text: "Review Rephrase" },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Original Text:*\n${userDraft}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Tone:*\n${
                selectedTone.charAt(0).toUpperCase() + selectedTone.slice(1)
              }`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Rephrased Message:*\n${rephrasedMessage}`,
            },
          },
        ],
        private_metadata: metadataString,
        submit: { type: "plain_text", text: "Send to Thread" },
        close: { type: "plain_text", text: "Close" },
      },
    });
  });

  app.view("final_post_action", async ({ ack, view, client }) => {
    await ack();

    try {
      const { channel_id, thread_ts, rephrasedMessage } = JSON.parse(
        view?.private_metadata
      );

      await client.chat.postMessage({
        channel: channel_id,
        thread_ts: thread_ts, // If this is null, it posts to the main channel
        text: rephrasedMessage,
      });

      console.log(`Message posted to channel ${channel_id}`);
    } catch (error) {
      console.error("Failed to post message:", error);
    }
  });
};
