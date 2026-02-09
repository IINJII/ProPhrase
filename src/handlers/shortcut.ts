import { App, StringIndexed } from "@slack/bolt";
import {
  FileStore,
  getModalStepBlocks,
  modalErrorResponseBlock,
  modalLoadingBlock,
  errorMessageBlock,
} from "../utils";
import { getOllamaChatResponse } from "../config";
import { DEFAULT_TONE, MODAL_STEPS } from "../constants";

export const registerShortcutHandlers = (params: {
  app: App<StringIndexed>;
  fileStore: FileStore<{ token: string; authorizedAt: number }>;
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
          await respond({
            response_type: "ephemeral",
            text: `Before taking this action you need to <${process.env.PUBLIC_URL}/slack/rephrase/install|authenticate with ProPhrase>`,
          });
          return;
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
        console.error("Error handling rephrase_message shortcut:", error);
        respond(errorMessageBlock);
      }
    },
  );

  app.view("rephrase_modal_submit", async ({ ack, view, client, respond }) => {
    try {
      const userDraft =
        view?.state?.values?.input_block_id?.user_message_action?.value ?? "";
      const selectedTone =
        view?.state?.values?.tone_selection?.change_tone?.selected_option
          ?.value ?? DEFAULT_TONE;

      await ack(modalLoadingBlock);

      const modelResponse = await getOllamaChatResponse({
        message: userDraft,
        tone: selectedTone,
      });
      const rephrasedMessage = modelResponse?.message?.content?.trim() || "";
      const contextData = JSON.parse(view?.private_metadata);
      const metadataString = JSON.stringify({
        ...contextData,
        rephrasedMessage,
      });

      const modalPreviewStep = getModalStepBlocks({
        step: MODAL_STEPS.PREVIEW,
        tone: selectedTone,
        originalMessage: userDraft,
        rephrasedMessage,
      });

      await client.views.update({
        view_id: view.id,
        view: {
          ...modalPreviewStep,
          private_metadata: metadataString,
        },
      });
    } catch (error) {
      console.error("Error handling rephrase_modal_submit view:", error);
      await ack(modalErrorResponseBlock);
    }
  });

  app.view("final_post_action", async ({ ack, view, client, respond }) => {
    try {
      await ack();
      const { channelId, threadTs, rephrasedMessage, userId } = JSON.parse(
        view?.private_metadata,
      );
      const userToken = fileStore.get(userId)?.token ?? "";
      if (!userToken) {
        console.error("No user token found for user:", userId);
        return;
      }

      await client.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: rephrasedMessage,
        token: userToken,
      });
    } catch (error) {
      console.error("Error handling final_post_action view:", error);
      await ack(modalErrorResponseBlock);
    }
  });
};
