import * as path from "path";
import { ExpressReceiver } from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { SCOPES, USER_SCOPE } from "../constants";
import { FileStore } from "../utils";

// In-memory storage for user tokens (in production, use a database)
const userTokens = new Map<string, string>();

export const registerOAuthHandlers = (params: {
  receiver: ExpressReceiver;
  fileStore: FileStore<{ userId: string; token: string }>;
}) => {
  const { receiver, fileStore } = params;

  receiver.router.get("/slack/oauth_redirect", async (req, res) => {
    const { code } = req?.query ?? {};
    if (!code) {
      res.status(400).send("Missing code parameter");
      return;
    }

    try {
      const client = new WebClient();
      const result = await client.oauth.v2.access({
        client_id: process.env.SLACK_CLIENT_ID || "",
        client_secret: process.env.SLACK_CLIENT_SECRET || "",
        code: code as string,
      });

      if (result?.authed_user?.access_token && result?.authed_user?.id) {
        // setUserToken(
        //   result?.authed_user?.id,
        //   result?.authed_user?.access_token
        // );
        fileStore.set(result?.authed_user?.id, {
          userId: result?.authed_user?.id,
          token: result?.authed_user?.access_token,
        });
      }

      res.sendFile(path.join(__dirname, "..", "assets", "success.html"));
    } catch (error) {
      console.error("OAuth error:", error);
      res.status(500).send("OAuth failed");
    }
  });

  receiver.router.get("/slack/install", (_, res) => {
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = `${process.env.PUBLIC_URL}/slack/oauth_redirect`;
    const scopes = SCOPES.join(",");
    const userScopes = USER_SCOPE;
    const installUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&user_scope=${userScopes}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;
    res.redirect(installUrl);
  });
};

export const getUserToken = (userId: string): string | undefined => {
  return userTokens.get(userId);
};

export const setUserToken = (userId: string, token: string): void => {
  userTokens.set(userId, token);
};

export const hasUserToken = (userId: string): boolean => {
  return userTokens.has(userId);
};
