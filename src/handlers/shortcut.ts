import { App, StringIndexed } from "@slack/bolt";
import { shortcutModalBlock } from "../utils";
import { DEFAULT_TONE } from "../constants";
import { getOllamaChatResponse } from "../config";

export const registerShortcutHandlers = (app: App<StringIndexed>) => {
  app.shortcut(
    "rephrase_message",
    async ({ shortcut, ack, client, respond }) => {
      try {
        await ack();

        const contextData = {
          // @ts-ignore
          channel_id: shortcut?.channel?.id ?? null,
          thread_ts:
            // @ts-ignore
            (shortcut?.message?.thread_ts || shortcut?.message.ts) ?? null,
          // @ts-ignore
          user_id: shortcut?.user?.id ?? null,
          // @ts-ignore
          message_user_id: shortcut?.message?.user ?? null,
        };

        // Check if user has authorized
        const { hasUserToken } = await import("./oauth");
        const userId = shortcut.user.id;

        if (!hasUserToken(userId)) {
          // Try to send ephemeral message (works in public channels where bot is member)
          try {
            await respond({
              response_type: "ephemeral",
              // @ts-ignore
              channel: shortcut.channel.id,
              user: userId,
              text: `⚠️ Authorization Required - Please visit ${process.env.PUBLIC_URL}/slack/install to authorize ProPhrase before using this feature.`,
            });
            return;
          } catch (error) {
            // If ephemeral message fails (DM, private channel, etc.),
            // just continue to open the modal
            console.log(
              "Could not send ephemeral auth message, opening modal instead"
            );
          }
        }

        await client.views.open({
          trigger_id: shortcut.trigger_id,
          view: {
            ...shortcutModalBlock,
            private_metadata: JSON.stringify(contextData),
          },
        });
      } catch (error) {
        console.error("Error opening modal:", error);
      }
    }
  );

  app.view("rephrase_modal_submit", async ({ ack, view }) => {
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

  app.view("final_post_action", async ({ ack, view, client, body }) => {
    await ack();

    try {
      const { channel_id, thread_ts, rephrasedMessage, user_id } = JSON.parse(
        view?.private_metadata
      );

      // Get user token from storage
      const { getUserToken } = await import("./oauth");
      const userToken = getUserToken(user_id);

      if (!userToken) {
        console.error("No user token found for user:", user_id);
        console.error("User needs to authorize the app at /slack/install");
        return;
      }

      // Only join public channels (starting with 'C')
      if (channel_id?.startsWith("C")) {
        try {
          await client.conversations.join({
            channel: channel_id,
          });
          console.log("Joined channel:", channel_id);
        } catch (err) {
          console.log("Could not join channel");
        }
      }

      // Post the message using user token
      await client.chat.postMessage({
        channel: channel_id,
        thread_ts: thread_ts,
        text: rephrasedMessage,
        token: userToken,
      });

      console.log(`Message posted successfully to ${channel_id}`);
    } catch (error) {
      console.error("Failed to post message:", JSON.stringify(error));
    }
  });
};
