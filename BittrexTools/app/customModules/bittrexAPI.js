var request=require('request');
var bittrex = require('node-bittrex-api');

exports.init = function (apikey, apisecret) {
	bittrex.options({
		'apikey' : apikey,
		'apisecret' : apisecret,
	});
}

exports.getBalance = function (currency) {
  return new Promise((resolve, reject) => {
      bittrex.getbalance({ currency: currency }, function (data, err) {
          if (err) {
              reject(err);
              return;
          }
		console.log( data.result.Balance );
		resolve(data.result.Balance);
	});
  })
}

exports.getDepositHistory = function (limit) {
  return new Promise((resolve, reject) => {
	bittrex.getdeposithistory({ }, function( data, err ) {
		if (err) {
			reject(err);
			return;
		}
		resolve(data.result);
	});
  })
}

exports.getMarketSummaries = function () {
    return new Promise((resolve, reject) => {
        bittrex.getmarketsummaries(function (data, err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(data.result);
        });
    })
}