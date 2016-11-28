var express = require('express')
var conf = require('./conf');
var request=require('request');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var app = express();
var session = require('express-session');
var passport = require('passport')
var OAuth2Strategy = require('passport-oauth2').Strategy;
app.set('view engine', 'ejs');

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

passport.use(new OAuth2Strategy({
    authorizationURL: conf.authorize_uri,
    tokenURL: conf.token_uri,
    clientID: conf.client_id,
    clientSecret: conf.client_secret,
    callbackURL: conf.redirect_uri,
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(accessToken);
  }
));


function sendReq(url, method, req, callback){
  request({
    uri: url,
    rejectUnauthorized: false,
    method: method,
    headers: {
      Authorization: req.headers.authorization,
      'Content-Type': 'application/json',
    },
    form: req.body
  },
  function(err, response, body) {
    if (err) return callback(err);
    if (response.statusCode !== 200) return callback(response.statusCode, body);
    try {
      const result = JSON.parse(body);
      return callback(null, result);
    } catch (e) {
      return callback(e);
    }
  });
}

app.get('/test',passport.authenticate('oauth2',{state:'12312'}));

// Oauth2.0 authorization code flow
app.get('/',function(req,res){
  if (!req.session.views) req.session.views = 0;
  req.session.token = null;
  const state = process.version + '-' + Math.random();
  res.render('home', { state: state, views: req.session.views });
})


//received authorization code from Clara.io, exchange authorization code for
//access token by sending post request to /oauth/token with code
app.get('/callback',
  passport.authenticate('oauth2', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/app');
  });
  /*
  if (!req.query.code) return res.json('no token found');
  req.session.state = req.query.state;

  var form = {
    client_id: conf.client_id,
    client_secret: conf.client_secret,
    redirect_uri: conf.redirect_uri,
    grant_type: 'authorization_code',
    code: req.query.code,
  };

  req.body = form;
  console.log('ask for token', form);

  sendReq(conf.host+"/oauth/token",'POST',req,function(err, result){
    console.log('token err?', err, result);
    if (err) {
      if (typeof err !== 'number') return res.sendStatus(500);
      return res.send(err, result);
    }

    req.session.token = result;
    return res.redirect('/app');
  });
});*/

app.get('/app', function(req, res) {
  if (!req.session.token) return res.redirect('/');
  res.render('app', {
    token: req.session.token,
    state: req.session.state,
    result: '',
    method: 'get',
    api: 'session',
    statusCode: '',
    askRefresh: false
  });
});



//redirect to clara.io oauth/ to start Oauth2.0 flow
app.get('/login',passport.authenticate('oauth2',{state:'1231'}));
 /* var qs = {
    client_id: conf.client_id,
    redirect_uri:conf.redirect_uri,
    state: req.query.state || '',
  }
  res.redirect(conf.authorize_uri + '?' + querystring.stringify(qs));
});*/

//user access token to call clara apis
app.post('/app',function(req,res){
  if (!req.session.token) return res.redirect('/');
  var token = req.session.token;
  var url = conf.host+'/api/'+req.body.api;
  var method = req.body.method;
  req.headers.authorization = 'Bearer '+token.access_token;
  sendReq(url,method,req,function(err,data){
    if (err && typeof err !== 'number') return res.json(err);

    const statusCode = err || 200;
    console.log('401?', statusCode === 401);

    res.render('app', {
      token: req.session.token,
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
  if (!req.session.token) return res.redirect('/');
  var token = req.session.token;
  var form = {
    client_id: conf.client_id,
    client_secret: conf.client_secret,
    // redirect_uri:conf.redirect_uri,
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token,
  };
  req.body = form;
  sendReq(conf.host+"/oauth/token",'POST', req, function(err,result){
    if(err && typeof err !== 'number') return res.json(err);
    if (err) return res.send(result);
    req.session.token = result;
    res.redirect('/app');
  });
});

app.listen(8080);
console.log('listening on: http://localhost:8080');
