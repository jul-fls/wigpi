require('dotenv').config();
const cal = require('./calendarLib.js');
const ics = require('./icsLib.js');
const json = require('./jsonLib.js');
const fs = require('fs');
const crypto = require('crypto');
$json = fs.readFileSync(process.env.ROOT_PATH + "api/classes.json");
$classes = JSON.parse($json);
async function getCoursForYear(year, user) {
    await cal.getCalendarForYear(year, user)
        .then((cours_of_the_year) => {
            for (j = 0; j < cours_of_the_year.length; j++) {
                if (cours_of_the_year[j] != undefined) {
                    for (k = 0; k < cours_of_the_year[j].length; k++) {
                        ics.write("event", cours_of_the_year[j][k], icsFileName);
                        json.write("event", cours_of_the_year[j][k], jsonFileName);
                    }
                }
            }
        });
}
async function getCoursForClass(username, classname, displayname) {
    icsFileName = process.env.ROOT_PATH + "icsFiles/" + classname + ".ics";
    jsonFileName = process.env.ROOT_PATH + "jsonFiles/" + classname + ".json";
    hashFileName = process.env.ROOT_PATH + "hashFiles/" + classname + ".md5";
    actualYear = new Date().getFullYear();
    nextYear = actualYear + 1;
    ics.write("start", displayname, icsFileName);
    json.write("start", displayname, jsonFileName);
    await getCoursForYear(actualYear, username)
        .then(() => {
            console.log("Done with year " + actualYear);
        });
    await getCoursForYear(nextYear, username)
        .then(() => {
            console.log("Done with year " + nextYear);
        })
        .then(async() => {
            ics.write("end", null, icsFileName);
            json.write("end", null, jsonFileName);
            await createHashFile(jsonFileName, hashFileName);
            console.log("Done writing ics file for class " + classname);
            console.log("Done writing json file for class " + classname);
        })
}

async function createHashFile(jsonFileName, hashFileName) {
    data = fs.readFileSync(jsonFileName);
    if (data) {
        const hash = crypto.createHash('md5').update(data).digest('hex');
        await fs.writeFile(hashFileName, hash, (err) => {
            if (err) throw err;
            console.log(`Hash saved to ${hashFileName}`);
        });
    }
}

async function getCoursForAllClasses() {
    for (let i = 0; i < $classes.length; i++) {
        $date = new Date();
        $date_str = ('0' + $date.getDate()).slice(-2) + "/" + ('0' + ($date.getMonth() + 1)).slice(-2) + "/" + $date.getFullYear() + " " + ('0' + $date.getHours()).slice(-2) + ":" + ('0' + $date.getMinutes()).slice(-2) + ":" + ('0' + $date.getSeconds()).slice(-2);
        console.log("[LOG CREATE ICS][" + $date_str + "] Début de la classe " + $classes[i].name);
        console.log("[LOG CREATE JSON][" + $date_str + "] Début de la classe " + $classes[i].name);
        await getCoursForClass($classes[i].username, $classes[i].name, $classes[i].displayname)
            .then(() => {
                console.log("Fini pour la classe " + $classes[i].name);
            })
        console.log("[LOG CREATE ICS][" + $date_str + "] Fin de la classe " + $classes[i].name);
        console.log("[LOG CREATE JSON][" + $date_str + "] Fin de la classe " + $classes[i].name);
    }
}
getCoursForAllClasses();