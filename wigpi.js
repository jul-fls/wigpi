require('dotenv').config();
const cal = require('./calendarLib.js');
const ics = require('./icsLib.js');
const fs = require('fs');
$json = fs.readFileSync(process.env.ROOT_PATH+"api/classes.json");
$classes = JSON.parse($json);
async function getCoursForYear(year, user) {
    await cal.getCalendarForYear(year, user)
        .then((cours_of_the_year) => {
            for (j = 0; j < cours_of_the_year.length; j++) {
                if (cours_of_the_year[j] != undefined) {
                    for (k = 0; k < cours_of_the_year[j].length; k++) {
                        ics.write("event", cours_of_the_year[j][k], icsFileName);
                    }
                }
            }
        });
}
async function getCoursForClass(username,classname,displayname) {
    icsFileName = process.env.ROOT_PATH+"icsFiles/" + classname + ".ics";
    // actualYear = new Date().getFullYear();
    // nextYear = actualYear + 1;
    actualYear = new Date().getFullYear()-1;
    nextYear = actualYear + 1;
    ics.write("start", displayname, icsFileName);
    await getCoursForYear(actualYear, username)
        .then(() => {
            console.log("Done with year " + actualYear);
        })
    await getCoursForYear(nextYear, username)
        .then(() => {
            console.log("Done with year " + nextYear);
        })
        .then(() => {
            ics.write("end", null, icsFileName);
            console.log("Done writing ics file for class " + classname);
        })
}
async function getCoursForAllClasses() {
    for (let i = 0; i < $classes.length; i++) {
        $date = new Date();
        $date_str = ('0' + $date.getDate()).slice(-2) + "/" + ('0' + ($date.getMonth() + 1)).slice(-2) + "/" + $date.getFullYear() + " " + ('0' + $date.getHours()).slice(-2) + ":" + ('0' + $date.getMinutes()).slice(-2) + ":" + ('0' + $date.getSeconds()).slice(-2);
        console.log("[LOG CREATE ICS]["+$date_str+"] Début de la classe " + $classes[i].name);
        await getCoursForClass($classes[i].username, $classes[i].name,$classes[i].displayname)
            .then(() => {
                console.log("Fini pour la classe " + $classes[i].name);
            })
        console.log("[LOG CREATE ICS]["+$date_str+"]+ Fin de la classe " + $classes[i].name);
    }
}
getCoursForAllClasses();