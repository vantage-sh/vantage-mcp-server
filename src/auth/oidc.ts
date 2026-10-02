import * as oauth from "oauth4webapi";

export async function getOidcConfig({
  issuer,
  client_id,
  client_secret,
}: {
  issuer: string;
  client_id: string;
  client_secret: string;
}) {
  const as = await oauth
    .discoveryRequest(new URL(issuer), { algorithm: "oidc" })
    .then((response) => oauth.processDiscoveryResponse(new URL(issuer), response));

  const client: oauth.Client = { client_id };
  const clientAuth = oauth.ClientSecretPost(client_secret);

  return { as, client, clientAuth };
}
