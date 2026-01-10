import { App, ExpressReceiver } from "@slack/bolt";
import * as path from "path";
import {
  registerCommandHandlers,
  registerOAuthHandlers,
  registerShortcutHandlers,
} from "./handlers";
import { SCOPES } from "./constants";
import { FileStore } from "./utils";

const fileStore = new FileStore<{ token: string; authorizedAt: number }>(
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
        fileStore.set(installation?.user?.id, {
          token: installation?.user?.token,
          authorizedAt: Date.now(),
        });
      }
      return;
    },
    fetchInstallation: async (installQuery) => {
      if (installQuery.userId) {
        const userDetails = fileStore.get(installQuery.userId);
        if (userDetails) {
          return {
            team: { id: installQuery.teamId || "" },
            enterprise: installQuery.enterpriseId
              ? { id: installQuery.enterpriseId }
              : undefined,
            user: {
              id: installQuery.userId,
              token: userDetails.token,
              scopes: SCOPES,
            },
          };
        }
      }

      // If not found, throw error
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
