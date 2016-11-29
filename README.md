#Clara Oauth2.0 client demo

The demo provides Oauth2.0 for Clara.io by Authorization code flow


##Authorization code flow
 - Start at http://localhost:8080
 - Redirect user to clara.io /login
 - Verify user credential
 - Grant authorization code
 - Exchange authorization code for token

##Refresh Token flow
 - Use refresh token to get new acess token when the old one expires.
 - Demo at  http://localhost:8080/refresh

## Usage

The demo use [passport-oauth2](https://github.com/jaredhanson/passport-oauth2) to generate strategy for Oauth2.0

#### Change config file conf.js
Change your client information in `conf.js`

```js
host:'https://clara.io',
client_id:'YOUR_CLIENT_ID',
client_secret: 'YOUR_CLIENT_SECRET',
redirect_uri:'http://localohost:8080/callback',
```
#### Use oauth2 strategy


```js

var passport = require('passport')
var OAuth2Strategy = require('passport-oauth2').Strategy;

var claraStrategy = new OAuth2Strategy({
	clientID: conf.client_id,
	clientSecret: conf.client_secret,
	authorizationURL: conf.host+'/oauth/authorize',
	tokenURL: conf.host+'/oauth/token'
	callbackURL: 'http://localohost:8080/callback'
},function oauthSucess(accessToken, refreshToken, profile, cb){
	//called after authorize sucess
}

passport.use(claraStrategy);

```
#### Authenticate Requests

Use `passport.authenticate()`, specifying the `'oauth2'` strategy, to
authenticate requests.

#### Error message
Error messages are returned in request query `'err'`when client fails to apply for authorization code.
Error messages are returned through response when authenticattion or apply for token fails.
