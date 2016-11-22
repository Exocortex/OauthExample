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
    res.render('callback',{token:token,layout:false});
    return;
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
      res.render('callback',{token:token,layout:false});
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


//user access token to call clara apis  
app.post('/callback',function(req,res){
  var token = cookie.load('token');
  var url = conf.host+'/api/'+req.body.api;
  var method = req.body.method;
  req.headers.authorization = 'Bearer '+token;
  sendReq(url,method,req,function(err,data){
    if(err) res.json(err);
    else res.json(data);
  });

});


//Password mode allow user to use client account on their, and apply 
//for access token with user credential and client credential to /oauth/token
app.get('/password_mode',function(req,res){
  res.render('login',{layout:false});
});

app.post('/password_mode',function(req,res){
  var url = conf.host+'/oauth/token';
  var method = 'POST';
  var form = {
     username:req.body.username,
     password:req.body.password,
     client_id:conf.client_id,
     client_secret:conf.client_secret,
     redirect_uri:conf.redirect_uri,
     grant_type:'password'
   };
  req.body = form;
  sendReq(url,method,req,function(err,data){
    if(err) console.log(err);
    else {
      cookie.save('token',data,{path:'/',maxAge:1800});
      res.redirect('/callback');
    }
  })
})
app.listen(8080);

