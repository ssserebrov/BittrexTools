var request=require('request');
var token;
var chatID;

exports.init = function (inToken, inChatID) {
	token = inToken;
	chatID = inChatID;
}

exports.sendMessage = function (msg) {
    if (msg === undefined) {
        return;
    }
    msg = msg.replace("+", "%2B");
    url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatID}&text=${msg}&parse_mode=html`;

	request(url, { json: true }, (err, res, body) => {
	if (err) { return console.log(err); }
	});
}

exports.bold = function (msg) {
    if (msg === undefined) {
        return;
    }
    return `<b>${msg}</b>`;
}
