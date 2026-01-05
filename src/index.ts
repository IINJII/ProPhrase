import { App, ExpressReceiver } from "@slack/bolt";
import { registerCommandHandlers, registerShortcutHandlers } from "./handlers";

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET || "",
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET || "my-secret",
  scopes: ["chat:write", "commands"],
  installationStore: {
    storeInstallation: async (installation) => {
      // Store user token when they install/authorize
      if (installation.user.token) {
        const { setUserToken } = await import("./handlers/oauth");
        setUserToken(installation.user.id, installation.user.token);
        console.log(`Stored token for user ${installation.user.id}`);
      }
      return;
    },
    fetchInstallation: async (installQuery) => {
      // Return a minimal installation object
      throw new Error("Installation not found");
    },
  },
});

registerCommandHandlers(app);
registerShortcutHandlers(app);

// OAuth routes
receiver.router.get("/slack/oauth_redirect", async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    res.status(400).send("Missing code parameter");
    return;
  }

  try {
    const { WebClient } = await import("@slack/web-api");
    const client = new WebClient();

    const result = await client.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code: code as string,
    });

    // Store the user token
    const { setUserToken } = await import("./handlers/oauth");
    if (result.authed_user?.access_token && result.authed_user?.id) {
      setUserToken(result.authed_user.id, result.authed_user.access_token);
      console.log(`OAuth success for user ${result.authed_user.id}`);
    }

    res.send(`
      <html>
        <body>
          <h1>Authorization Successful!</h1>
          <p>You can now close this window and return to Slack.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).send("OAuth failed");
  }
});

receiver.router.get("/slack/install", (req, res) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = `${process.env.PUBLIC_URL}/slack/oauth_redirect`;
  const scopes = "chat:write,commands";
  const userScopes = "chat:write";

  const installUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&user_scope=${userScopes}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;

  res.send(`
    <html>
      <body>
        <h1>Install ProPhrase</h1>
        <a href="${installUrl}">
          <img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" />
        </a>
      </body>
    </html>
  `);
});

(async () => {
  const port = Number(process.env.PORT) || 3000;
  await app.start(port);
  console.log(`ProPhrase running on port ${port}!`);
  console.log(`Install URL: http://localhost:${port}/slack/install`);
})();
