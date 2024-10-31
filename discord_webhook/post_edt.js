require('dotenv').config();
const fs = require('fs');
const path = require('path');
const htmlLib = require('../libs/htmlLib.js');
const cal = require('../libs/calendarLib.js');
const discordLib = require('./discordLib.js');
const miscLib = require('../libs/miscLib.js');
const $classes = JSON.parse(fs.readFileSync(process.env.ROOT_PATH + "config/classes.json", 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function getNextMondayOrPreviousMonday() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // Sunday is 0, Monday is 1, ..., Saturday is 6

    let targetMonday = new Date(today);

    if (dayOfWeek === 0 || dayOfWeek >= 5) {
        // If it's Sunday (0), Friday (5), or Saturday (6), get the next Monday
        const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        targetMonday.setDate(today.getDate() + daysUntilNextMonday);
    } else {
        // If it's Monday (1) to Thursday (4), get the previous Monday
        targetMonday.setDate(today.getDate() - (dayOfWeek - 1));
    }

    return targetMonday;
}

async function postEDTForClass(class_name) {
    const targetMonday = getNextMondayOrPreviousMonday(); // Get either the next or previous Monday
    const $date_str = ('0' + targetMonday.getDate()).slice(-2) + "/" + ('0' + (targetMonday.getMonth() + 1)).slice(-2) + "/" + targetMonday.getFullYear();
    const $date_str_2 = ('0' + (targetMonday.getMonth() + 1)).slice(-2) + "/" + ('0' + targetMonday.getDate()).slice(-2) + "/" + targetMonday.getFullYear();
    console.log("Target Monday: " + $date_str_2);

    const base_url = process.env.WIGOR_BASE_URL;

    const cookies = await miscLib.getCookiesForUser(class_name.user);
    if (cookies !== null) {
        class_name.user.cookies = cookies;
    } else {
        console.error("Erreur lors de la récupération des cookies pour l'utilisateur " + class_name.user.username);
        return;
    }

    await cal.getCalendarForWeek(base_url, class_name.user, $date_str_2)
        .then(async (cours_of_the_week) => {
            if (cours_of_the_week && cours_of_the_week.length > 0) {
                await htmlLib.GenerateHTML(class_name.name, $date_str_2, cours_of_the_week)
                    .then(async () => {
                        console.log("HTML generated for " + class_name.name);
                        await discordLib.post_edt(class_name.webhookid, class_name.webhooktoken, class_name.roleid, class_name.channelid, $date_str, class_name.name, class_name.user.groupNumber);
                    });
            } else {
                console.log("No course for this week for class " + class_name.name);
            }
            await sleep(1000); // Sleep for 1 second between classes
        });
}

async function postEDTForAllClasses() {
    fs.writeFileSync(process.env.ROOT_PATH + "output/post_edt.lock", "1");
    for (let i = 0; i < $classes.length; i++) {
        const $date = new Date();
        const $date_str = ('0' + $date.getDate()).slice(-2) + "/" + ('0' + ($date.getMonth() + 1)).slice(-2) + "/" + $date.getFullYear() + " " + ('0' + $date.getHours()).slice(-2) + ":" + ('0' + $date.getMinutes()).slice(-2) + ":" + ('0' + $date.getSeconds()).slice(-2);
        console.log("[LOG POST EDT][" + $date_str + "] Début de la classe " + $classes[i].name);
        await postEDTForClass($classes[i]);
        console.log("[LOG POST EDT][" + $date_str + "] Fin de la classe " + $classes[i].name);
    }
    fs.writeFileSync(process.env.ROOT_PATH + "output/post_edt.lock", "0");
}

// Export the main function to be used in the API
module.exports = {
    postEDTForAllClasses
};
