require('dotenv').config();
const fs = require('fs');
const path = require('path');
const paths = require('../config/paths');
const htmlLib = require('../libs/htmlLib.js');
const cal = require('../libs/calendarLib.js');
const discordLib = require('./discordLib.js');
const miscLib = require('../libs/miscLib.js');

const classes = JSON.parse(fs.readFileSync(path.join(paths.config, 'classes.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function getNextMondayOrPreviousMonday() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // Sunday is 0, Monday is 1, ..., Saturday is 6

    const targetMonday = new Date(today);

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
    const targetMonday = getNextMondayOrPreviousMonday();
    const date_str = ('0' + targetMonday.getDate()).slice(-2) + "/" + 
                    ('0' + (targetMonday.getMonth() + 1)).slice(-2) + "/" + 
                    targetMonday.getFullYear();
    const date_str_2 = ('0' + (targetMonday.getMonth() + 1)).slice(-2) + "/" + 
                       ('0' + targetMonday.getDate()).slice(-2) + "/" + 
                       targetMonday.getFullYear();
    console.log(`Target Monday: ${date_str_2}`);

    const base_url = process.env.WIGOR_BASE_URL;

    const cookies = await miscLib.getCookiesForUser(class_name.user);
    if (cookies !== null) {
        class_name.user.cookies = cookies;
    } else {
        console.error(`Erreur lors de la récupération des cookies pour l'utilisateur ${class_name.user.username}`);
        return;
    }

    await cal.getCalendarForWeek(base_url, class_name.user, date_str_2)
        .then(async (cours_of_the_week) => {
            if (cours_of_the_week && cours_of_the_week.length > 0) {
                await htmlLib.GenerateHTML(class_name.name, date_str_2, cours_of_the_week)
                    .then(async () => {
                        console.log(`HTML generated for ${class_name.name}`);
                        await discordLib.post_edt(
                            class_name.webhookid, 
                            class_name.webhooktoken, 
                            class_name.roleid, 
                            date_str, 
                            class_name.name, 
                            class_name.user.groupNumber
                        );
                    });
            } else {
                console.log(`No course for this week for class ${class_name.name}`);
            }
            await sleep(1000); // Sleep for 1 second between classes
        });
}

async function postEDTForAllClasses() {
    const lockFilePath = path.join(paths.output.lock, 'post_edt.lock');
    fs.writeFileSync(lockFilePath, "1");

    for (const classItem of classes) {
        const date = new Date();
        const date_str = date.toLocaleString('fr-FR', { 
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false 
        });

        console.log(`[LOG POST EDT][${date_str}] Début de la classe ${classItem.name}`);
        await postEDTForClass(classItem);
        console.log(`[LOG POST EDT][${date_str}] Fin de la classe ${classItem.name}`);
    }

    fs.writeFileSync(lockFilePath, "0");
}

module.exports = {
    postEDTForAllClasses
};
