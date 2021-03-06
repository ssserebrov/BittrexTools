process.on('unhandledRejection', (err) => {
    console.error(err)
    process.exit(1)
})
const cron = require('node-cron');
const fs = require('fs');
const jsonfile = require('jsonfile');

const bitxAPI = require('my-node-bittrex');
const teleAPI = require('my-node-telegram');

const config = readJson('./app/config/config.json');
const depositFile = './app/db/deposit.json';
const historyFile = './app/db/history.json';

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
const getDepositHistories = async (limit) => {
    const history = await bitxAPI.getDepositHistories();
    if (limit !== undefined)
        return history.slice(0, limit);
    return history;
}

const getDepositHistory = async (currency) => {
    const history = await bitxAPI.getDepositHistory(currency);
    return history;
}


const checkMarket = async () => {
    const market = await bitxAPI.getMarketSummaries();

    for (const i in market) {
        marketName = market[i].MarketName;
        price = market[i].Last;
        msg = `${marketName}: ${price}`;

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

const getTotalUsdtBalance = async () => {
    let balances = await bitxAPI.getBalances();
    let markets = await bitxAPI.getMarketSummaries();
    let totalBtcBalance = 0.0;
    let totalUsdBalance = 0.0;
    let historyItem = {};
    let balancesUsd = {};
    let btcToUsdt;

    for (let market of markets) {
        if (market.MarketName === 'USDT-BTC') {
            btcToUsdt = market.Last;
            break;
        }
    }

    for (let currency of balances) {
        if (currency.Currency === "BTC") {
            totalBtcBalance += currency.Balance;
            balancesUsd[currency.Currency] = currency.Balance * btcToUsdt;
            continue;
        }

        const btcMarketName = `BTC-${currency.Currency}`;
        for (let market of markets) {

            if (market.MarketName === btcMarketName) {
                const currencyBtcBalance = currency.Balance * market.Last;
                totalBtcBalance += currencyBtcBalance;
                balancesUsd[currency.Currency] = currencyBtcBalance * btcToUsdt;
            }
        }
    }

    totalUsdBalance = totalBtcBalance * btcToUsdt;


    console.log(totalUsdBalance + "$");









    let history = jsonfile.readFileSync(historyFile);
    let d = new Date();
    console.log(d);

    historyItem['datetime'] = d;
    historyItem['total'] = totalUsdBalance;
    historyItem['balances'] = balancesUsd;

    history.push(historyItem);

    jsonfile.writeFileSync(historyFile, history)

    return totalUsdBalance;
}


const getMarketSummary = async (market) => {
    const summary = await bitxAPI.getMarketSummary(market);
    return summary;
}

function showTimeLeftSinceLastTransaction(history) {
    const date = new Date(history[0].LastUpdated + "Z");
    const timeSpan = timeLeft(date);
    console.log(timeSpan);
}

function timeLeft(endDate) {
    const now = new Date();
    const diff = now - endDate;

    return dateToHMSObject(diff);
}

function dateToHMSObject(date) {
    const hours = Math.floor(date / 3.6e6);
    const minutes = Math.floor((date % 3.6e6) / 6e4);
    const seconds = Math.floor((date % 6e4) / 1000);
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
    teleAPI.init(config.telegram.APIkey, config.telegram.chatID, 'Bittrex Tools');
}

const main = async () => {
    console.log("main");

    await getTotalUsdtBalance();

    let db = jsonfile.readFileSync(depositFile);
    const lastDeposit = new Date(db.lastDeposit);

    const history = await getDepositHistories(15);

    db.lastDeposit = history[0].LastUpdated;
    jsonfile.writeFileSync(depositFile, db)

    for (let deposit of history) {
        const depositDate = new Date(deposit.LastUpdated);


        if (depositDate.getTime() <= lastDeposit.getTime())
            break;

        //find prev deposit
        let profit;
        for (let prevDeposit of history) {
            const prevDepositDate = new Date(prevDeposit.LastUpdated);

            if (deposit.Currency !== prevDeposit.Currency ||
                prevDepositDate.getTime() >= depositDate.getTime())
                continue;

            const miningTimeMs = depositDate - prevDepositDate;
            const miningTimeH = miningTimeMs / 1000 / 60 / 60;

            const summ = await getMarketSummary(`USDT-${deposit.Currency}`);
            const price = summ[0].Last;
            const profitPerHour = price / miningTimeH;
            const profitPerMonth = profitPerHour * 24 * 30;

            profit = (profitPerMonth).toFixed()

            console.log(profit);

            break;
        }


        const total = await bitxAPI.getBalance(deposit.Currency);
        let msg = '';
        msg += `${deposit.Currency}: +${deposit.Amount}\n`;
        msg += `Profit: ${profit}$\n`;
        msg += `Total: ${total}\n`;

        teleAPI.sendMessage(msg);
    }

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
var task = cron.schedule('30 */10 * * * *', function () {
    main().catch(err => {
        console.log(err);
    });
});