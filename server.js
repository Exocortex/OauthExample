var express = require('express')
var conf = require('./conf');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var api = require('./api');
var session = require('express-session');
var passport = require('passport')
var OAuth2Strategy = require('passport-oauth2').Strategy;
var app = express();

var users = {}; // local session state for demo purposes

function oauthSuccess(req, accessToken, refreshToken, profile, callback) {
  users[profile.username] = profile;
  req.session.tokens = { access_token: accessToken, refresh_token: refreshToken };
  return callback(null, profile);
}


function loadUserProfile(accessToken, done) {
  var url = conf.get('host') + '/api/session';
  api.callApi({ access_token: accessToken }, url, 'GET', function(err, result) {
    return done(null, result && result.user);
  });
}

OAuth2Strategy.prototype.userProfile = loadUserProfile;

var claraStrategy = new OAuth2Strategy({
  clientID: conf.get('client_id'),
  clientSecret: conf.get('client_secret'),
  authorizationURL: conf.get('host')+'/oauth/authorize',
  tokenURL: conf.get('host')+'/oauth/token',
  callbackURL: conf.get('redirect_uri'),
  passReqToCallback: true,
}, oauthSuccess);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

app.set('view engine', 'ejs');

passport.use(claraStrategy);


app.use(session({
  secret: 'super super secret',
  resave: false,
  saveUninitialized: true,
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// simple logger
app.use(function(req, res, next){
  console.log('%s %s', req.method, req.url);
  next();
});

//use passport to store token granted from clara
app.use(passport.initialize());
app.use(passport.session());
passport.deserializeUser(function(username, done) {
  return done(null, users[username]);
});

passport.serializeUser(function(user, done) {
  done(null, user && user.username);
});

// Oauth2.0 authorization code flow
app.get('/', function(req, res) {
  if (req.user) return res.redirect('/app');

  var state = { version: process.version, num: Math.random() };
  res.render('home', { state: state, stateString: JSON.stringify(state) });
});

app.get('/logout', function(req, res) {
  req.logOut();
  return res.redirect('/');
});


// redirect to clara.io oauth/ to start Oauth2.0 flow
app.get('/login', function(req, res) {
  passport.authenticate('oauth2', { state: req.query.state })(req,res);
});

//received authorization code from Clara.io, exchange authorization code for
//access token by sending post request to /oauth/token with code
app.get('/callback', passport.authenticate('oauth2', { failureRedirect: '/' }),
  function(req, res) {
    req.session.state = JSON.parse(req.query.state);
    res.redirect('/app');
  }
);


app.get('/app', function(req, res) {
  if (!req.user) return res.redirect('/');

  res.render('app', {
    host: conf.get('host'),
    user: req.user,
    state: req.session.state,
    result: '',
    method: 'GET',
    api: 'session',
    statusCode: '',
    askRefresh: false
  });
});

//user access token to call clara apis
app.post('/app',function(req,res){
  if (!req.user) return res.redirect('/');

  var tokens = req.session.tokens;

  var url = conf.get('host')+'/api/'+req.body.api;
  var method = req.body.method;

  api.callApi(tokens, url, method, function(err, result, newTokens) {
    if (err && typeof err !== 'number') return res.json(err);
    if (newTokens) req.session.tokens = newTokens;
    const statusCode = err || 200;

    res.render('app', {
      host: conf.get('host'),
      user: req.user,
      state: req.session.state,
      result: JSON.stringify(result, null, '  '),
      method: method,
      api: req.body.api,
      statusCode: statusCode,
    });
  });
});

app.listen(8080);
console.log('listening on: http://localhost:8080');
