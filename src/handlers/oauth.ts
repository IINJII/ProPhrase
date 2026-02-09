import * as path from "path";
import { ExpressReceiver } from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { Router } from "express";
import { SCOPES, USER_SCOPE } from "../constants";
import { FileStore } from "../utils";

export const registerOAuthHandlers = (params: {
  receiver: ExpressReceiver;
  fileStore: FileStore<{ token: string; authorizedAt: number }>;
  basePath?: string;
}) => {
  const { receiver, fileStore, basePath = "" } = params;
  const router = Router();

  router.get("/oauth_redirect", async (req, res) => {
    try {
      const { code } = req?.query ?? {};
      if (!code) {
        res.status(400).send("Missing code parameter");
        return;
      }

      const client = new WebClient();
      const result = await client.oauth.v2.access({
        client_id: process.env.SLACK_CLIENT_ID || "",
        client_secret: process.env.SLACK_CLIENT_SECRET || "",
        code: code as string,
      });

      if (result?.authed_user?.access_token && result?.authed_user?.id) {
        fileStore.set(result?.authed_user?.id, {
          token: result?.authed_user?.access_token,
          authorizedAt: Date.now(),
        });
      }

      res.sendFile(path.join(__dirname, "..", "assets", "success.html"));
    } catch (error) {
      console.error("Error handling /slack/oauth_redirect route:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  router.get("/install", (_, res) => {
    try {
      const clientId = process.env.SLACK_CLIENT_ID;
      const redirectUri = `${process.env.PUBLIC_URL}${basePath}/oauth_redirect`;
      const scopes = SCOPES.join(",");
      const userScopes = USER_SCOPE;
      const installUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&user_scope=${userScopes}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}`;
      res.redirect(installUrl);
    } catch (error) {
      console.error("Error handling /slack/install route:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  receiver.router.use(basePath, router);
};
