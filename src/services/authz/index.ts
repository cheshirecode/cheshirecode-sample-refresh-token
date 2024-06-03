export const getConfig = () => ({
  redirect_uri: location.href,
  authz_uri: "https://interview-api.vercel.app/api/authorize",
  token_uri: "https://interview-api.vercel.app/api/oauth/token",
  requested_scopes: "*",
  expiresAtKey: "expires_at_",
});
