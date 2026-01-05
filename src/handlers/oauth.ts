import { App, StringIndexed } from "@slack/bolt";

// In-memory storage for user tokens (in production, use a database)
const userTokens = new Map<string, string>();

export const registerOAuthHandlers = (app: App<StringIndexed>) => {
  // OAuth callback handler
  app.use(async ({ context, next }) => {
    // Add user token to context if available
    if (context.userId) {
      const userToken = userTokens.get(context.userId);
      if (userToken) {
        // @ts-ignore
        context.userToken = userToken;
      }
    }
    await next();
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
