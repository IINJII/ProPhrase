import { App, StringIndexed } from "@slack/bolt";
import { DEFAULT_TONE } from "../constants";
import { getOllamaChatResponse } from "../config";
import { createRephreasedEphemeralMessageBlock } from "../utils";

export const registerCommandHandlers = (app: App<StringIndexed>) => {
  app.command("/rephrase", async ({ command, ack, respond }) => {
    await ack();

    const userInput = command.text;
    const parts = userInput?.trim().split(" ");
    let tone = DEFAULT_TONE;
    let message = userInput;

    if (parts?.[0]?.startsWith("-")) {
      tone = parts?.[0]?.substring(1).toLowerCase();
      message = parts?.slice(1).join(" ");
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

    try {
      await respond(ephimeralMessageBlock);
    } catch (error) {
      await respond(
        `Something went wrong while rephrasing the message: ${error}`
      );
    }
  });

  app.action("change_tone", async ({ body, ack, respond }) => {
    await ack();

    const selectedTone =
      // @ts-ignore
      body?.actions?.[0]?.selected_option?.value;

    const originalMessage =
      // @ts-ignore
      body?.message?.metadata?.event_payload?.original_message;

    const response = await getOllamaChatResponse({
      tone: selectedTone,
      message: originalMessage,
    });

    const newRephrased = response.message.content.trim() || "";
    const ephimeralMessageBlock = createRephreasedEphemeralMessageBlock({
      message: originalMessage,
      tone: selectedTone,
      rephrasedMessage: newRephrased,
    });

    await respond({ replace_original: true, ...ephimeralMessageBlock });
  });

  app.action(
    "send_message_to_channel",
    async ({ ack, body, action, client, respond }) => {
      await ack();

      try {
        const channelId = body?.channel?.id ?? "";
        if (action.type === "button") {
          await respond({
            delete_original: true,
          });

          await client.conversations.join({
            channel: channelId,
          });

          const rephrasedMessage = action.value ?? "";

          await client.chat.postMessage({
            channel: channelId,
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
        console.error(error);
      }
    }
  );

  app.action("delete_preview", async ({ ack, respond }) => {
    await ack();
    await respond({
      delete_original: true,
    });
  });
};
