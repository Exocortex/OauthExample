var request=require('request');
var conf = require('./conf');

var sendReq = function sendReq(url, method, req, callback){
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

var refreshToken = function(token,callback){
  var form = {
    client_id: conf.get('client_id'),
    client_secret: conf.get('client_secret'),
    redirect_uri:conf.get('redirect_uri'),
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token,
  };
  var req={};
  req.body = form;
  req.headers = {
    authorization:'Basic',
    'Content-Type': 'application/json',
  };
  sendReq(conf.get('host')+"/oauth/token",'POST', req, function(err,result){
    if(err && typeof err !== 'number') return callback(err);
    if(err) return callback(err);
    callback(null,result);
  });
}

exports.oauthSucess = function oauthSucess(accessToken, refreshToken, profile, cb) {
  var token = {};
  token.access_token = accessToken;
  token.refresh_token = refreshToken;
  cb(null,token);
}

exports.callApi = function(token,url,method,callback){
  var call = function(token,url,method,cb){
    var req = {};
    req.headers = {
      authorization:'Bearer '+token.access_token,
      'Content-Type': 'application/json',
    };
    req.body = {};
    sendReq(url,method,req,function(err,result){
      if(err && typeof err !== 'number') return cb(err);
      if(err) return cb(err);
      return cb(null,result);
    });

  };

  call(token,url,method,function(err,result){

    if(!err || err !== 401) return callback(null,result);

    refreshToken(token,function(err,newToken){
      if(err) return callback(err);
      call(newToken,url,method,function(err,result){
        if (err && err === 401) return console.log('Error fetching new token');
        callback(null,result,newToken);
      })
    })
  })
}
