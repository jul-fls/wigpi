require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dt = require('./DateTimeLib.js');
const parser = require('./ParserLib.js');
const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));
const interval = 1; //ms

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCalendarForYear(year, user) {
    const weeks = dt.getWeeks(year);
    const cours_of_the_year = [];
    await sleep(interval)
        .then(async () => {
            for (const week of weeks) {
                const base_url = process.env.EDT_BASE_URL;
                await getCalendarForWeek(base_url, user, week)
                    .then((cours_of_the_week) => {
                        cours_of_the_year.push(cours_of_the_week);
                    }
                );
            }
        });
    return cours_of_the_year;
}

async function getCalendarForWeek(base_url, user, date) {
    const url = base_url + "?date=" + date;
    const requestBodyJson = {
        cookies: user.cookies
    };
    let responseBody;

    await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBodyJson)
    })
        .then(response => response.text())
        .then(body => {
            responseBody = body;
        })
        .catch(error => {
            console.error('Une erreur s\'est produite lors de l\'accès à l\'url ' + url + "\nErreur: " + error);
            setTimeout(function() { getCalendarForWeek(base_url, user, date) }, 2000);
        });

    console.log("Getting calendar for week " + date + ", url : " + url);
    // save html file to "debugHTMLFiles" folder
    // fs.writeFile(path.join(__dirname, 'debugHTMLFiles', crypto.createHash('md5').update(url).digest('hex') + '.html'), responseBody, function(err) {
    //     if (err) {
    //         return console.log(err);
    //     }
    //     console.log("The debugHTML file was saved!");
    // });
    return await parser.parseHTMLForWeek(responseBody, date, user.groupNumber);
}

module.exports = {
    getCalendarForYear: getCalendarForYear,
    getCalendarForWeek: getCalendarForWeek
};
