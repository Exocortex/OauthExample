var request=require('request');


exports.oauthSucess = function oauthSucess(accessToken, refreshToken, profile, cb) {
  var token = {};
  token.access_token = accessToken;
  token.refresh_token = refreshToken;
  cb(null,token);
}

exports.sendReq = function sendReq(url, method, req, callback){
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
