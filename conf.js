var cc = require('config-chain');

var defaults = {
	host:'https://clara.io',
	client_id:'YOUR_CLIENT_ID',
	client_secret: 'YOUR_CLIENT_SECRET',
	redirect_uri:'http://localhost:8080/callback',
}

module.exports = cc(cc.env(''), defaults);
