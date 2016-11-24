var express = require('express')
var conf = require('./conf');
var request=require('request');
var bodyParser = require('body-parser');
var cookie = require('react-cookie');
var app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

function sendReq(url,method,req,cb){
  request({
    uri: url,
    rejectUnauthorized: false,
    method: method,
    headers:{
      Authorization:req.headers.authorization,
      'Content-Type': 'application/json',
    },
    form:req.body
  }, 
  function(error, response, body) {
    if(error) cb(err);
    else cb(null, body);
  });
}
// Oauth2.0 authorization code flow
app.get('/',function(req,res){
  cookie.remove('token');
  res.render('home',{layout:false});
})


//received authorization code from Clara.io, exchange authorization code for 
//access token by sending post request to /oauth/token with code
app.get('/callback',function(req,res){
  var token = cookie.load('token');
  if(typeof token !== 'undefined'){
    res.render('callback',{token:token,accessToken:token.access_token,refreshToken:token.refresh_token,layout:false});
  }
  else if(req.query.code){
    var code = req.query.code;

    var form= {
      client_id:conf.client_id,
      client_secret:conf.client_secret,
      redirect_uri:conf.redirect_uri,
      grant_type:'authorization_code',
      code: code,
    };

    req.body = form;
    sendReq(conf.host+"/oauth/token",'POST',req,function(err,token){
      if(err) res.json(err);
      cookie.save('token',token,{path:'/',maxAge:1800});
      res.render('callback',{token:token,accessToken:token.access_token,refreshToken:token.refresh_token,layout:false});
    });

  }
  else {
    res.json('no token found');
  }
});



//redirect to clara.io oauth/ to start Oauth2.0 flow
app.get('/login',function(req,res){
	res.redirect(conf.authorize_uri+'?client_id='+conf.client_id+'&redirect_uri='+conf.redirect_uri);
});


app.get('/callapi',function(req,res){
  res.render('callapi',{layout:false});
});

//user access token to call clara apis  
app.post('/callapi',function(req,res){
  var token = cookie.load('token');
  var url = conf.host+'/api/'+req.body.api;
  var method = req.body.method;
  req.headers.authorization = 'Bearer '+token.access_token;
  sendReq(url,method,req,function(err,data){
    if(err) res.json(err);
    else res.json(data);
  });

});

//when token expires, use refresh token to get new token

app.get('/refresh',function(req,res){
  res.render('refresh',{layout:false});
})

app.post('/refresh',function(req,res){
  var token = cookie.load('token');
  var form= {
      client_id:conf.client_id,
      client_secret:conf.client_secret,
      redirect_uri:conf.redirect_uri,
      grant_type:'refresh_token',
      refresh_token: token.refresh_token,
    };
  req.body = form;
  sendReq(conf.host+"/oauth/token",'POST',req,function(err,newToken){
    if(err) res.json(err);
      cookie.save('token',newToken,{path:'/',maxAge:1800});
      res.redirect('/callback')
    });
});
app.listen(8080);