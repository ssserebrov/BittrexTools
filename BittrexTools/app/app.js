process.on('unhandledRejection', (err) => {
    console.error(err)
    process.exit(1)
})
const cron = require('node-cron');
const fs = require('fs');
const jsonfile = require('jsonfile');

const bitxAPI = require('./customModules/bittrexAPI');
const teleAPI = require('./customModules/teleAPI');

const config = readJson('./app/config/config.json');
const depositFile = './app/db/deposit.json';

function readJson(path) {
    return JSON.parse(fs.readFileSync(path, 'utf8'))
}
/*
const checkDepositHistory = async (currency) => {
    console.log("Start");

    const history = await bitxAPI.getDepositHistory(currency);
    for (const i in history) {
        const date = new Date(history[i].LastUpdated + "Z");
        const timeLeft = timeLeftSec(date);
        if (timeLeft > updateRate) {
            break;
        }

        const balanceETC = await bitxAPI.getBalance(currency);
        await teleAPI.sendMessage(balanceETC);
    }
    showTimeLeftSinceLastTransaction(history);
    console.log("Finish");
}
*/
const getDepositHistory = async (limit) => {
    const history = await bitxAPI.getDepositHistory();
    if (limit !== undefined)
        return history.slice(0, limit);
    return history;
}

const checkMarket = async () => {
    const market = await bitxAPI.getMarketSummaries();

    for (const i in market) {
        marketName = market[i].MarketName;
        price = market[i].Last;
        msg = marketName + ': ' + price;
        if (marketName == 'USDT-BTC') {
            console.log(msg);
            if (price < 9500)
                await teleAPI.sendMessage(msg);
        }
        if (marketName == 'USDT-ETC') {
            console.log(msg);
            if (price < 27)
                await teleAPI.sendMessage(msg);
        }
    }
    //  console.log(market);
}

function showTimeLeftSinceLastTransaction(history) {
    const date = new Date(history[0].LastUpdated + "Z");
    const timeSpan = timeLeft(date);
    console.log(timeSpan);
}

function timeLeft(endDate) {
    const now = new Date();
    const diff = now - endDate;

    const hours = Math.floor(diff / 3.6e6);
    const minutes = Math.floor((diff % 3.6e6) / 6e4);
    const seconds = Math.floor((diff % 6e4) / 1000);
    return {
        seconds: seconds,
        minutes: minutes,
        hours: hours
    };
}

function timeLeftSec(endDate) {
    const time = timeLeft(endDate);
    return (time.seconds + time.minutes * 60 + time.hours * 60 * 60);
}

function init() {
    bitxAPI.init(config.bittrex.APIkey, config.bittrex.APIsecret);
    teleAPI.init(config.telegram.APIkey, config.telegram.chatID);
}

const main = async () => {
    console.log("main");
    let db = jsonfile.readFileSync(depositFile);
    const lastDeposit = new Date(db.lastDeposit);

    const history = await getDepositHistory(5);

    for (const i in history) {
        const currentDeposit = new Date(history[i].LastUpdated);


        if (currentDeposit.getTime() <= lastDeposit.getTime())
            break;

        const total = await bitxAPI.getBalance(history[i].Currency);
        const msg = `${history[i].Currency}: +${history[i].Amount}\nTotal: ${total}`;


        teleAPI.sendMessage(msg);
    }


    db.lastDeposit = history[0].LastUpdated;
    jsonfile.writeFileSync(depositFile, db)

    console.log("main exit");
}



//
//var task = cron.schedule('*/10 * * * *', function () {
//    checkDepositHistory('ETC').catch(err => {
//        console.log(err);
//    });
//});
init();
main();
//checkMarket();
var task = cron.schedule('*/10 * * * *', function () {
    main().catch(err => {
        console.log(err);
    });
});