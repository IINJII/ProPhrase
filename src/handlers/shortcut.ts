import { App, StringIndexed } from "@slack/bolt";
import { FileStore, getModalStepBlocks } from "../utils";
import { getOllamaChatResponse } from "../config";
import { hasUserToken, getUserToken } from "./oauth";
import { DEFAULT_TONE, MODAL_STEPS } from "../constants";

export const registerShortcutHandlers = (params: {
  app: App<StringIndexed>;
  fileStore: FileStore<{ userId: string; token: string }>;
}) => {
  const { app, fileStore } = params;

  app.shortcut(
    "rephrase_message",
    async ({ shortcut, ack, client, respond }) => {
      try {
        await ack();

        const contextData = {
          // @ts-ignore
          channelId: shortcut?.channel?.id ?? null,
          threadTs:
            // @ts-ignore
            (shortcut?.message?.thread_ts || shortcut?.message.ts) ?? null,
          // @ts-ignore
          userId: shortcut?.user?.id ?? null,
          // @ts-ignore
          messageUserId: shortcut?.message?.user ?? null,
        };

        if (fileStore.has(contextData.userId) === false) {
          try {
            await respond({
              response_type: "ephemeral",
              text: `Before taking this action you need to <${process.env.PUBLIC_URL}/slack/install|authenticate with ProPhrase>`,
            });
            return;
          } catch (error) {
            console.log("Error sending auth ephemeral message:", error);
          }
        }

        const modalInputStep = getModalStepBlocks({ step: MODAL_STEPS.INPUT });

        await client.views.open({
          trigger_id: shortcut?.trigger_id,
          view: {
            ...modalInputStep,
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

    const modalPreviewStep = getModalStepBlocks({
      step: MODAL_STEPS.PREVIEW,
      tone: selectedTone,
      originalMessage: userDraft,
      rephrasedMessage,
    });

    await ack({
      response_action: "update",
      view: {
        ...modalPreviewStep,
        private_metadata: metadataString,
      },
    });
  });

  app.view("final_post_action", async ({ ack, view, client }) => {
    await ack();

    try {
      const { channelId, threadTs, rephrasedMessage, userId } = JSON.parse(
        view?.private_metadata
      );
      const userToken = fileStore.get(userId)?.token ?? "";
      if (!userToken) {
        console.error("No user token found for user:", userId);
        return;
      }
      try {
        await client.conversations.join({
          channel: channelId,
        });
      } catch (err) {
        console.log("Could not join channel");
      }

      await client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: rephrasedMessage,
        token: userToken,
      });

      console.log(`Message posted successfully to ${channelId}`);
    } catch (error) {
      console.error("Failed to post message:", JSON.stringify(error));
    }
  });
};
