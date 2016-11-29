var request=require('request');
var conf = require('./conf');

var sendReq = function sendReq(url, method, authHeader, body, callback){
  console.log(' - ', method, url);

  var headers = { 'Content-Type': 'application/json' };
  if (authHeader) headers.authorization = authHeader;

  request({
    uri: url,
    rejectUnauthorized: false,
    method: method,
    headers: headers,
    form: body
  }, function(err, response, body) {
    if (err) return callback(err);
    if (response && response.statusCode !== 200) return callback(response.statusCode, body);
    try {
      const result = JSON.parse(body);
      return callback(null, result);
    } catch (e) {
      return callback(e);
    }
  });
}

var refreshToken = function(token,callback){
  var body = {
    client_id: conf.get('client_id'),
    client_secret: conf.get('client_secret'),
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token,
  };
  sendReq(conf.get('host')+"/oauth/token", 'POST', null, body, callback);
}

exports.callApi = function(tokens, url, method, callback) {
  var call = function(tokens, url, method, cb){
    sendReq(url, method, 'Bearer '+tokens.access_token, {}, function(err, result){
      if (err && typeof err !== 'number') return cb(err);
      if (err) return cb(err);
      return cb(null, result);
    });
  };

  call(tokens, url, method, function(err, result) {
    if (!err || err !== 401) return callback(err, result);

    refreshToken(tokens, function(err, newTokens) {
      if (err) return callback(err);

      console.log('Refreshed Tokens');

      call(newTokens, url, method, function(err, result) {
        callback(err, result, newTokens);
      });
    })
  })
}
