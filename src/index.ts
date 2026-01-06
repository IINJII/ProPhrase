import { App, ExpressReceiver } from "@slack/bolt";
import * as path from "path";
import {
  registerCommandHandlers,
  registerOAuthHandlers,
  registerShortcutHandlers,
  setUserToken,
} from "./handlers";
import { SCOPES } from "./constants";
import { FileStore } from "./utils";

const fileStore = new FileStore<{ userId: string; token: string }>(
  path.join(__dirname, "..", "store.gen", "token_store.json")
);

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET || "",
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET,
  scopes: SCOPES,
  installationStore: {
    storeInstallation: async (installation) => {
      if (installation?.user?.token) {
        setUserToken(installation?.user?.id, installation?.user?.token);
      }
      return;
    },
    fetchInstallation: async (installQuery) => {
      // Return a minimal installation object
      throw new Error("Installation not found");
    },
  },
});

registerOAuthHandlers({ receiver, fileStore });
registerCommandHandlers({ app, fileStore });
registerShortcutHandlers({ app, fileStore });

(async () => {
  const port = Number(process.env.PORT) || 3000;
  await app.start(port);
  console.log(`ProPhrase running on port ${port}!`);
})();
