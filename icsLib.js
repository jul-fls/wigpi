var fs = require('fs');

function start(class_displayname){
    timezone = "BEGIN:VTIMEZONE\n";
    timezone += "TZID:Europe/Paris\n";
    timezone += "X-LIC-LOCATION:Europe/Paris\n";
    timezone += "X-WR-TIMEZONE:Europe/Paris\n";
    timezone += "BEGIN:DAYLIGHT\n";
    timezone += "TZOFFSETFROM:+0100\n";
    timezone += "TZOFFSETTO:+0200\n";
    timezone += "TZNAME:CEST\n";
    timezone += "DTSTART:19700329T020000\n";
    timezone += "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\n";
    timezone += "END:DAYLIGHT\n";
    timezone += "BEGIN:STANDARD\n";
    timezone += "TZOFFSETFROM:+0200\n";
    timezone += "TZOFFSETTO:+0100\n";
    timezone += "TZNAME:CET\n";
    timezone += "DTSTART:19701025T030000\n";
    timezone += "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\n";
    timezone += "END:STANDARD\n";
    timezone += "END:VTIMEZONE\n";
    ics = "BEGIN:VCALENDAR\n" + 
    timezone +
    "VERSION:2.0\n" +
    "X-WR-CALNAME:"+class_displayname+" - Calendrier\n" +
    "NAME:"+class_displayname+" - Calendrier\n" +
    "X-WR-CALDESC:Emploi du temps des cours des "+class_displayname+"\n" +
    "DESCRIPTION:Emploi du temps des cours des "+class_displayname+"\n";
    return ics;
}
function end(){
    ics = "END:VCALENDAR";
    // console.log("end");
    return ics;
}
async function write(type,data,icsFileName){
    if(type == "start"){
        ics = start(data);
        await fs.writeFile(icsFileName, ics, function(err) {
            if(err) {
                return err;
            }
        });
    }else if(type == "end"){
        ics = end();
        fs.appendFile(icsFileName, ics, function(err) {
            if(err) {
                return err;
            }
        });
    }else if(type == "event"){
        tzid = "TZID=Europe/Paris:";
        dtstamp = new Date().toISOString().replace(/-|:|\.\d+/g, "");
        dtstamp = dtstamp.substring(0, dtstamp.length - 1);
        ics = "BEGIN:VEVENT" + "\n" +
        "UID:" + data.uid + "\n" +
        "LAST-MODIFIED:" + dtstamp + "\n" +
        "DTSTAMP;" + tzid + dtstamp + "\n" +
        "DTSTART;" + tzid + data.dtstart + "\n" +
        "DTEND;" + tzid + data.dtend + "\n" +
        "SUMMARY:" + data.matiere + "\n" +
        "LOCATION:" + (data.batiment != "Visio" ? "Batiment : " + data.batiment + " Salle : " + data.salle : "Visio") + "\n";
        if(data.lien_teams != undefined){
            ics += "URL:" + data.lien_teams + "\n";
        }
        if(data.prof && data.prof != ""){
            ics += "ATTENDEE;CN=\"" + data.prof.name + "\";ROLE=REQ-PARTICIPANT:mailto:" + data.prof.email + "\n";
            ics += "ORGANIZER;CN=\"" + data.prof.name + "\":mailto:epsi@example.com\n";
        }
        ics += "BEGIN:VALARM" + "\n" +
        "TRIGGER:-PT15M" + "\n" +
        "ACTION:DISPLAY" + "\n" +
        "DESCRIPTION:Reminder" + "\n" +
        "END:VALARM" + "\n";
        ics += "END:VEVENT" + "\n";
        fs.appendFile(icsFileName, ics, function(err) {
            if(err) {
                return err;
            }
        });
    }
}
module.exports = { write: write };