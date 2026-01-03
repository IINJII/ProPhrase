import { App } from "@slack/bolt";
import { createRephreasedEphemeralMessageBlock } from "./utils";
import { getOllamaChatResponse } from "./config";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

app.command("/rephrase", async ({ command, ack, respond }) => {
  await ack();

  const threadTs = command?.thread_ts;

  const userInput = command.text;
  const parts = userInput?.trim().split(" ");
  let tone = "professional";
  let message = userInput;

  if (parts?.[0]?.startsWith("-")) {
    tone = parts?.[0]?.substring(1).toLowerCase();
    message = parts?.slice(1).join(" ");
  }

  const response = await getOllamaChatResponse({
    tone,
    message,
  });

  const rephrasedMessage = response?.message?.content?.trim() || "";
  const ephimeralMessageBlock = createRephreasedEphemeralMessageBlock({
    message,
    tone,
    rephrasedMessage,
    threadTs,
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

app.action("delete_preview", async ({ ack, respond, body }) => {
  await ack();

  await respond({
    delete_original: true,
  });
});

(async () => {
  const port = Number(process.env.PORT) || 3000;
  await app.start(port);
  console.log(`ProPhrase running on port ${port}!`);
})();
