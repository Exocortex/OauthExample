var express = require('express')
var conf = require('./conf');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var api = require('./api');
var session = require('express-session');
var passport = require('passport')
var OAuth2Strategy = require('passport-oauth2').Strategy;
var app = express();

var claraStrategy = new OAuth2Strategy({
  clientID: conf.get('client_id'),
  clientSecret: conf.get('client_secret'),
  authorizationURL: conf.get('host')+'/oauth/authorize',
  tokenURL: conf.get('host')+'/oauth/token',
  callbackURL: conf.get('redirect_uri'),
},api.oauthSucess);

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
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.serializeUser(function(token, done) {
  done(null, token);
});

// Oauth2.0 authorization code flow
app.get('/',function(req,res){
  if (!req.session.views) req.session.views = 0;
  req.session.token = null;
  const state = process.version + '-' + Math.random();
  res.render('home', { state: state, views: req.session.views });
})


//redirect to clara.io oauth/ to start Oauth2.0 flow
app.get('/login',
  function(req,res,next){
    if(req.user) return res.redirect('/app');
    next();
  },
  function(req,res){
    passport.authenticate('oauth2',{state:req.query.state})(req,res);
  }
);

//received authorization code from Clara.io, exchange authorization code for
//access token by sending post request to /oauth/token with code
app.get('/callback',
  function(req,res,next){
    if(req.query.err) return res.json(req.query.err);
    else next();
  },
  passport.authenticate('oauth2', { failureRedirect: '/' }),
  function(req,res){
    req.session.state = req.query.state;
    res.redirect('/app');
  }
);


app.get('/app', function(req, res) {
  if (!req.user) return res.redirect('/');
  var token = req.user;
  res.render('app', {
    token: token,
    state: req.session.state,
    result: '',
    method: 'get',
    api: 'session',
    statusCode: '',
    askRefresh: false
  });
});

//user access token to call clara apis
app.post('/app',function(req,res){
  if (!req.user) return res.redirect('/');
  var token = req.user;
  var url = conf.get('host')+'/api/'+req.body.api;
  var method = req.body.method;
  api.callApi(token,url,method,function(err,result,newToken){
    if(err) return res.json(err);
    const statusCode = 200;
    if(newToken){
      req.login(newToken,function(err){
        if(err) return res.json(err);
        res.render('app', {
          token: req.user,
          state: req.session.state,
          result: JSON.stringify(result, null, '  '),
          method: method,
          api: req.body.api,
          statusCode: statusCode,
        });
      });
    }
    else {
      res.render('app', {
        token: req.user,
        state: req.session.state,
        result: JSON.stringify(result, null, '  '),
        method: method,
        api: req.body.api,
        statusCode: statusCode,
      });
    }
  });
});

app.listen(8080);
console.log('listening on: http://localhost:8080');
