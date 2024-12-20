require('dotenv').config();
const cal = require('./libs/calendarLib.js');
const ics = require('./libs/icsLib.js');
const json = require('./libs/jsonLib.js');
const misc = require('./libs/miscLib.js');
const compare = require('./libs/compareLib.js');
const paths = require('./config/paths');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));
const $json = fs.readFileSync(path.join(paths.config, 'classes.json'));
const $classes = JSON.parse($json);

async function getCoursForYear(year, user, icsFileName, jsonFileName) {
    await cal.getCalendarForYear(year, user)
        .then((cours_of_the_year) => {
            for (const cours of cours_of_the_year) {
                if (cours != undefined) {
                    for (const k of cours) {
                        ics.write("event", k, icsFileName);
                        json.write("event", k, jsonFileName);
                    }
                }
            }
        });
}


async function getCoursForClass(user, classname, displayname) {
    const icsFileName = path.join(paths.output.ics, `${classname}.ics.tmp`);
    const jsonFileName = path.join(paths.output.json, `${classname}.json.tmp`);
    const now = new Date();
    // if now is after or the 1st of september and before the 1st of january, the actual year is the current year, and if now is after or the 1st of january and before the 1st of september, the actual year is the current year - 1
    let actualYear;
    if (now.getMonth() >= 8) {
        actualYear = now.getFullYear();
    } else {
        actualYear = now.getFullYear() - 1;
    }
    const nextYear = actualYear + 1;
    ics.write("start", displayname, icsFileName);
    json.write("start", displayname, jsonFileName);

    // Use await to wait for the cookies
    const cookies = await misc.getCookiesForUser(user);
    
    if (cookies !== null) {
        user.cookies = cookies;
    } else {
        console.error("Erreur lors de la récupération des cookies pour l'utilisateur " + user.username);
        return;
    }

    await getCoursForYear(actualYear, user, icsFileName, jsonFileName)
    .then(() => {
        console.log("Done with year " + actualYear);
    });

    await getCoursForYear(nextYear, user, icsFileName, jsonFileName)
        .then(() => {
            console.log("Done with year " + nextYear);
        })
        .then(async() => {
            ics.write("end", null, icsFileName);
            json.write("end", null, jsonFileName);
            console.log("Done writing ics file for class " + classname);
            console.log("Done writing json file for class " + classname);
        });

    // Ensure temp files are properly renamed
    const $icsFiles = fs.readdirSync(paths.output.ics);
    const $jsonFiles = fs.readdirSync(paths.output.json);
    for (const file of $icsFiles) {
        if (file.includes(".tmp")) {
            await fs.promises.rename(
                path.join(paths.output.ics, file),
                path.join(paths.output.ics, file.replace(".tmp", ""))
            );
            console.log("Done writing ics file for class " + file.replace(".tmp", ""));
        }
    }
    for (const file of $jsonFiles) {
        if (file.includes(".tmp")) {
            const newFileName = file.replace(".tmp", "");
            await fs.promises.rename(
                path.join(paths.output.json, file),
                path.join(paths.output.json, newFileName)
            );
            console.log("Done writing json file for class " + newFileName);
        }
    }
}

async function getCoursForAllClasses() {
    for (const classItem of $classes) {
        let $date = new Date();
        let $date_str = ('0' + $date.getDate()).slice(-2) + "/" + ('0' + ($date.getMonth() + 1)).slice(-2) + "/" + $date.getFullYear() + " " + ('0' + $date.getHours()).slice(-2) + ":" + ('0' + $date.getMinutes()).slice(-2) + ":" + ('0' + $date.getSeconds()).slice(-2);
        console.log("[LOG CREATE ICS][" + $date_str + "] Début de la classe " + classItem.name);
        console.log("[LOG CREATE JSON][" + $date_str + "] Début de la classe " + classItem.name);
        
        await getCoursForClass(classItem.user, classItem.name, classItem.displayname)
            .then(() => {
                console.log("Fini pour la classe " + classItem.name);
            });
        
        console.log("[LOG CREATE ICS][" + $date_str + "] Fin de la classe " + classItem.name);
        console.log("[LOG CREATE JSON][" + $date_str + "] Fin de la classe " + classItem.name);
    }

    // sleep for 10 seconds
    await new Promise(r => setTimeout(r, 10000));

    // move the tmp files to the final ones
    const $icsFiles = fs.readdirSync(paths.output.ics);
    const $jsonFiles = fs.readdirSync(paths.output.json);

    for (const file of $icsFiles) {
        if (file.includes(".tmp")) {
            await fs.promises.rename(
                path.join(paths.output.ics, file),
                path.join(paths.output.ics, file.replace(".tmp", ""))
            );
            console.log("Done writing ics file for class " + file.replace(".tmp", ""));
        }
    }

    for (const file of $jsonFiles) {
        if (file.includes(".tmp")) {
            const newFileName = file.replace(".tmp", "");
            await fs.promises.rename(
                path.join(paths.output.json, file),
                path.join(paths.output.json, newFileName)
            );
            console.log("Done writing json file for class " + newFileName);
        }
    }

    console.log("Done writing ics file for all classes");
    console.log("Done writing json file for all classes");
}

function createFakeCoursMaintenances() {
//    create a loop to iterate every day from the 01/01/2024 to 31/12/2024
    for (let i = 0; i < 365; i++) {
        const date = new Date("2024-01-01");
        date.setDate(date.getDate() + i);
        // convert the date to YYYYMMDDT000000Z format
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '') + "T";
        ics.write("event", {
            dtstart: dateStr + "080000",
            dtend: dateStr + "090000",
            matiere: "Nous rencontrons actuellement un problème avec notre fournisseur de données et nous prenons des mesures pour résoudre ces problèmes dès que possible. Nous vous prions de nous excuser pour la gêne occasionnée.", 
            prof: {name: "Erreur", email: "erreur@epsi.fr"},
            salle: "Erreur",
            batiment: "Erreur",
            visio: false,
            description: "",
            uid: crypto.createHash('md5').update(dateStr + "080000" + "090000" + "Erreur" + "Erreur" + "Erreur" + "Erreur").digest("hex")
        }, icsFileName);
        json.write("event", {
            dtstart: dateStr + "080000",
            dtend: dateStr + "090000",
            matiere: "Nous rencontrons actuellement un problème avec notre fournisseur de données et nous prenons des mesures pour résoudre ces problèmes dès que possible. Nous vous prions de nous excuser pour la gêne occasionnée.", 
            prof: {name: "Erreur", email: "erreur@epsi.fr"},
            salle: "Erreur",
            batiment: "Erreur",
            visio: false,
            description: ""
        }, jsonFileName);
    }
}

async function refreshEDT() {
    // Main function to trigger refresh
    // Copy the old json files to a backup folder for comparison
    // create a temp lock file to prevent multiple refreshes at the same time
    fs.writeFileSync(path.join(paths.output.lock, 'refresh.lock'), "1");
    fs.cpSync(
        paths.output.json,
        path.join(paths.root, 'output', 'oldjsonFiles'),
        {recursive: true}
    );
    await getCoursForAllClasses().then(() => {
        compare.compareClasses($classes);
        fs.writeFileSync(path.join(paths.output.lock, 'refresh.lock'), "0");
    });
}

module.exports = {
    refreshEDT
};