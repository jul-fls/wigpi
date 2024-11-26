const fs = require('fs');

function start(class_displayname){
    const timezone = "BEGIN:VTIMEZONE\n" +
    "TZID:Europe/Paris\n" +
    "X-LIC-LOCATION:Europe/Paris\n" +
    "X-WR-TIMEZONE:Europe/Paris\n" +
    "BEGIN:DAYLIGHT\n" +
    "TZOFFSETFROM:+0100\n" +
    "TZOFFSETTO:+0200\n" +
    "TZNAME:CEST\n" +
    "DTSTART:19700329T020000\n" +
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\n" +
    "END:DAYLIGHT\n" +
    "BEGIN:STANDARD\n" +
    "TZOFFSETFROM:+0200\n" +
    "TZOFFSETTO:+0100\n" +
    "TZNAME:CET\n" +
    "DTSTART:19701025T030000\n" +
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\n" +
    "END:STANDARD\n" +
    "END:VTIMEZONE\n";
    const ics = "BEGIN:VCALENDAR\n" + 
    timezone +
    "VERSION:2.0\n" +
    "X-WR-CALNAME:"+class_displayname+" - Calendrier\n" +
    "NAME:"+class_displayname+" - Calendrier\n" +
    "X-WR-CALDESC:Emploi du temps des cours des "+class_displayname+"\n" +
    "DESCRIPTION:Emploi du temps des cours des "+class_displayname+"\n";
    return ics;
}
function end(){
    const ics = "END:VCALENDAR";
    // console.log("end");
    return ics;
}
async function write(type,data,icsFileName){
    if(type == "start"){
        const ics = start(data);
        await fs.writeFile(icsFileName, ics, function(err) {
            if(err) {
                return err;
            }
        });
    }else if(type == "end"){
        const ics = end();
        fs.appendFile(icsFileName, ics, function(err) {
            if(err) {
                return err;
            }
        });
    }else if(type == "event"){
        const tzid = "TZID=Europe/Paris:";
        let dtstamp = new Date().toISOString().replace(/-|:|\.\d+/g, "");
        dtstamp = dtstamp.substring(0, dtstamp.length - 1);
        let ics = "BEGIN:VEVENT" + "\n" +
        "UID:" + data.uid + "\n" +
        "LAST-MODIFIED:" + dtstamp + "\n" +
        "DTSTAMP;" + tzid + dtstamp + "\n" +
        "DTSTART;" + tzid + data.dtstart + "\n" +
        "DTEND;" + tzid + data.dtend + "\n" +
        "SUMMARY:" + data.matiere + "\n" +
        "LOCATION:" + (data.batiment != "Visio" ? "Batiment : " + data.batiment + " Salle : " + data.salle : "Visio") + "\n";
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