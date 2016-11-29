# Clara Oauth2.0 client demo

This node.js app demonstrates using Clara.io for authorization using [oauth2](https://oauth.net/2/).

See [OAuth2 Simplified](https://aaronparecki.com/2012/07/29/2/oauth2-simplified) for a quick introduction.

## Get started

	* Obtain an OAuth credentials (contact Clara.io support)
	* Run `yarn install`, or `npm install`
	* Run `client_id={YOUR_CLIENT_ID} client_secret={YOUR_CLIENT_SECRET} redirect_uri={REDIRECT_URI} node ./server.js`
	* You should then be able to load up the app, and log in with clara.io

The demo uses [passport-oauth2](https://github.com/jaredhanson/passport-oauth2) to control the
oauth2 flow.

## Implementation Notes

* The only implemented OAuth2 flow is "authorization code" for server based apps.
* The Authorization endpoint to begin authorization is https://clara.io/oauth/authorize with required parameters:

	* `client_id` MUST match the one provided with your Application credentials
	* `response_type` MUST be equal to 'code'
	* `redirect_uri` MUST be provided, and must equal the one provided with your application credentials

* The Request token endpoint is https://clara.io/oauth/token -- to obtain an access token, POST with:

	* `client_id` MUST match the one provided with your Application credentials
	* `client_secret` MUST match the one provided with your Application credentials
  * `grant_type` MUST be equal to 'authorization_code' (or `refresh_token`)
	* `redirect_uri` MUST be equal to the on provided with your application credentials
	* `code` Required for initial access token, MUST be equal to the code provided from the `authorize` request
	* `refresh_token` Required to renew the access token, MUST equal the refresh token provided in previous token request

* The `access_token` is not a long lasting token, so be sure to use the `refresh_token` to request new
tokens should the original request return a 401 status.

* If a `state` query parameter is provided to the `/oauth/authorize` endpoint, it will be returned
  in the `code` callback. This provides the ability to store state attached to the user before authentication,
	in order to respond properly after authentication.

## Errors

Errors will be returned with the `error` code, and `error_description` property. If there is a problem
with the initial authorize code request, the `redirect_uri` will be called with the `error` and
`error_description` in the query string. If there is a problem with getting an access token, the
`error` and `error_description` will be returned in the JSON body.

Potential `error` codes are:

  * `invalid_request` - Likely due to missing parameters. Have you attached the required parameters listed above?
	* `invalid_client` - For errors in the oauth client values (`client_id`, `client_secret` or `redirect_uri`).
	* `server_error` - An unexpected error from the oauth server. Please contact support if the error persists.