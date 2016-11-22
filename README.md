#Clara Oauth2.0 client demo

The demo provides Oauth2.0 authorization by authorization code flow and password flow.


##Authorization code flow
 - start at http://localhost:8080
 - redirect user to clara.io /oauth/login 
 - verify user credential
 - grant authorization code
 - exchange authorization code for access token 

##Password flow
 - login at http://localhost:8080/password_mode
 - get access token from clara.io 


