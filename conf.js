var cc = require('config-chain');
var opts = require('optimist').argv;
var env =opts.env||process.env.YOUR_APP_ENV ||'dev';

var conf = cc(opts,
	cc.env('clara_'),{
	host:'https://clara.io',
	client_id:'YOUR_CLIENT_ID',
	client_secret: 'YOUR_CLIENT_SECRET',
	redirect_uri:'http://localhost:8080/callback',
});

module.exports = conf;
