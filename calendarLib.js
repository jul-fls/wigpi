require('dotenv').config();
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
const dt = require('./DateTimeLib.js');
const parser = require('./Parser.js');
const fetch = (...args) =>
    import ('node-fetch').then(({ default: fetch }) => fetch(...args));
var serverids = process.env.WIGOR_SERVER_IDS.split("");
var interval = 1; //ms
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function getCalendarForYear(year, user) {
    weeks = dt.getWeeks(year);
    cours_of_the_year = [];
    await sleep(interval)
        .then(async() => {
            for (i = 0; i < weeks.length; i++) {
                base_url = base_url = process.env.WIGOR_BASE_URL;
                serverid = serverids[Math.floor(Math.random() * serverids.length)];
                await getCalendarForWeek(base_url, serverid, user, weeks[i])
                    .then((cours_of_the_week) => {
                        cours_of_the_year.push(cours_of_the_week);
                    });
            }
        });
    return cours_of_the_year;
}
async function getCalendarForWeek(base_url, serverid, user, date) {
    url = base_url + "&Tel=" + user + "&Date=" + date + "&serverid=" + serverid;
    $body = "";
    await fetch(url)
        .then(response => response.text())
        .then(body => {
            $body = body;
        })
        .catch(error => {
            console.error('Une erreur s\'est produite lors de l\'accès à l\'url ' + url + "\nErreur: " + error);
            serverid = serverids[serverids.indexOf(serverid) + 1];
            setTimeout(function() { getCalendarForWeek(base_url, serverid, user, date) }, 2000);
        });
    console.log("Getting calendar for week " + date + ", url : " + url);
    //save html file to "debugHTMLFiles" folder
    // fs.writeFile(path.join(__dirname, 'debugHTMLFiles', crypto.createHash('md5').update(url).digest('hex') + '.html'), $body, function(err) {
    //     if (err) {
    //         return console.log(err);
    //     }
    //     console.log("The debugHTML file was saved!");
    // });
    return await parser.parseHTMLForWeek($body, date);
}

module.exports = {
    getCalendarForYear: getCalendarForYear,
    getCalendarForWeek: getCalendarForWeek
};