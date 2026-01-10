import { App, StringIndexed } from "@slack/bolt";
import { DEFAULT_TONE } from "../constants";
import { getOllamaChatResponse } from "../config";
import {
  createRephreasedEphemeralMessageBlock,
  errorMessageBlock,
  FileStore,
} from "../utils";

export const registerCommandHandlers = (params: {
  app: App<StringIndexed>;
  fileStore: FileStore<{ token: string; authorizedAt: number }>;
}) => {
  const { app, fileStore } = params;

  app.command("/rephrase", async ({ command, ack, respond }) => {
    try {
      await ack();

      if (fileStore.has(command?.user_id) === false) {
        await respond({
          response_type: "ephemeral",
          text: `Before taking this action you need to <${process.env.PUBLIC_URL}/slack/install|authenticate with ProPhrase>`,
        });
        return;
      }

      const userInput = command?.text?.trim();
      const parts = userInput?.split(" ");
      let tone = DEFAULT_TONE;
      let message = userInput ?? "";

      if (parts?.[0]?.startsWith("-")) {
        tone = parts?.[0]?.substring(1).toLowerCase() || DEFAULT_TONE;
        message = parts?.slice(1).join(" ").trim();
      }

      const modelResponse = await getOllamaChatResponse({
        tone,
        message,
      });

      const rephrasedMessage = modelResponse?.message?.content?.trim() || "";
      const ephimeralMessageBlock = createRephreasedEphemeralMessageBlock({
        message,
        tone,
        rephrasedMessage,
      });

      await respond(ephimeralMessageBlock);
    } catch (error) {
      console.error("Error handling /rephrase command:", error);
      await respond(errorMessageBlock);
    }
  });

  app.action("refresh_rephrase", async ({ body, ack, respond }) => {
    try {
      await ack();

      const selectedTone =
        // @ts-ignore
        body?.state?.values?.tone_selection?.change_tone?.selected_option
          ?.value ?? DEFAULT_TONE;
      const originalMessage =
        // @ts-ignore
        body?.state?.values?.original_message_block?.original_message_input
          ?.value ?? ""?.trim();

      let rephrasedMessage = "";
      if (originalMessage.length > 0) {
        const modelResponse = await getOllamaChatResponse({
          tone: selectedTone,
          message: originalMessage,
        });
        rephrasedMessage = modelResponse?.message?.content?.trim() || "";
      }

      const ephimeralMessageBlock = createRephreasedEphemeralMessageBlock({
        message: originalMessage,
        tone: selectedTone,
        rephrasedMessage,
      });

      await respond({ replace_original: true, ...ephimeralMessageBlock });
    } catch (error) {
      console.error("Error handling refresh_rephrase action:", error);
      await respond(errorMessageBlock);
    }
  });

  app.action("change_tone", async ({ body, ack, respond }) => {
    try {
      await ack();

      const selectedTone =
        // @ts-ignore
        body?.state?.values?.tone_selection?.change_tone?.selected_option
          ?.value ?? DEFAULT_TONE;
      const originalMessage =
        // @ts-ignore
        body?.state?.values?.original_message_block?.original_message_input
          ?.value ?? ""?.trim();

      let rephrasedMessage = "";
      if (originalMessage.length > 0) {
        const modelResponse = await getOllamaChatResponse({
          tone: selectedTone,
          message: originalMessage,
        });
        rephrasedMessage = modelResponse?.message?.content?.trim() || "";
      }

      const ephimeralMessageBlock = createRephreasedEphemeralMessageBlock({
        message: originalMessage,
        tone: selectedTone,
        rephrasedMessage,
      });

      await respond({ replace_original: true, ...ephimeralMessageBlock });
    } catch (error) {
      console.error("Error handling change_tone action:", error);
      await respond(errorMessageBlock);
    }
  });

  app.action(
    "send_message_to_channel",
    async ({ ack, body, action, client, respond }) => {
      try {
        await ack();

        const channelId = body?.channel?.id ?? "";
        if (action?.type === "button") {
          await respond({
            delete_original: true,
          });

          const rephrasedMessage = action?.value ?? "";
          const userToken = fileStore.get(body?.user?.id ?? "")?.token ?? "";

          await client.chat.postMessage({
            channel: channelId,
            token: userToken,
            text: rephrasedMessage,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: rephrasedMessage,
                },
              },
            ],
          });
        }
      } catch (error) {
        console.error("Error handling send_message_to_channel action:", error);
        await respond(errorMessageBlock);
      }
    }
  );

  app.action("delete_preview", async ({ ack, respond }) => {
    try {
      await ack();
      await respond({
        delete_original: true,
      });
    } catch (error) {
      console.error("Error handling delete_preview action:", error);
      await respond(errorMessageBlock);
    }
  });
};
