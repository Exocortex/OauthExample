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
  clientID: conf.client_id,
  clientSecret: conf.client_secret,
  authorizationURL: conf.host+'/oauth/authorize',
  tokenURL: conf.host+'/oauth/token',
  callbackURL: conf.redirect_uri,
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
  var url = conf.host+'/api/'+req.body.api;
  var method = req.body.method;
  req.headers.authorization = 'Bearer '+token.access_token;
  api.sendReq(url,method,req,function(err,data){
    if (err && typeof err !== 'number') return res.json(err);

    const statusCode = err || 200;
    console.log('401?', statusCode === 401);

    res.render('app', {
      token: req.user,
      state: req.session.state,
      result: JSON.stringify(data, null, '  '),
      method: method,
      api: req.body.api,
      statusCode: statusCode,
      askRefresh: statusCode === 401,
    });
  });

});

//when token expires, use refresh token to get new token

app.get('/refresh',function(req,res){
  if (!req.user) return res.redirect('/');
  var token = req.user;
  var form = {
    client_id: conf.client_id,
    client_secret: conf.client_secret,
    redirect_uri:conf.redirect_uri,
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token,
  };
  req.body = form;
  api.sendReq(conf.host+"/oauth/token",'POST', req, function(err,result){
    if(err && typeof err !== 'number') return res.json(err);
    if (err) return res.send(result);
    req.login(result,function(err){
      if(err) res.send(err);
      res.redirect('/app');
    })
  });
});

app.listen(8080);
console.log('listening on: http://localhost:8080');
