import { App } from "@slack/bolt";
import { registerCommandHandlers, registerShortcutHandlers } from "./handlers";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

registerCommandHandlers(app);
registerShortcutHandlers(app);

(async () => {
  const port = Number(process.env.PORT) || 3000;
  await app.start(port);
  console.log(`ProPhrase running on port ${port}!`);
})();
