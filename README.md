#Clara Oauth2.0 client demo

The demo provides Oauth2.0 authorization by authorization code flow


##Authorization code flow
 - Change client information in conf.js
 - Start at http://localhost:8080
 - Redirect user to clara.io /oauth/login 
 - Verify user credential
 - Grant authorization code
 - Exchange authorization code for token 

#Refresh Token flow 
 - Use refresh token to get new acess token when the old one expires. 
 - Demo at  http://localhost:8080/refresh