var fs = require('fs');

function start(class_displayname) {
    json = "[{\n";
    json += "\"classname\": \"" + class_displayname + "\",\n";
    json += "\"description\": \"Emploi du temps des cours des " + class_displayname + "\"\n},{\"courses\": [\n";
    return json;
}

function end() {
    json = "\n]}\n]";
    return json;
}

function write(type, data, jsonFileName) {
    if (type == "start") {
        json = start(data);
        fs.writeFile(jsonFileName, json, function(err) {
            if (err) {
                return err;
            }
        });
    } else if (type == "end") {
        //before writing the end of the json file, we need to remove the last comma
        fs.readFile(jsonFileName, 'utf8', function(err, data) {
            if (err) {
                return err;
            }
            data = data.substring(0, data.length - 2);
            data += end();
            fs.writeFile(jsonFileName, data, function(err) {
                if (err) {
                    return err;
                }
            });
        });
    } else if (type == "event") {
        json = "{\n";
        json += "\"dtstart\": \"" + data.dtstart + "\",\n";
        json += "\"dtend\": \"" + data.dtend + "\",\n";
        json += "\"matiere\": \"" + data.matiere + "\",\n";
        json += "\"prof\": \"" + data.prof + "\",\n";
        json += "\"salle\": \"" + data.salle + "\",\n";
        if (data.lien_teams != undefined) {
            json += "\"teamslink\": \"" + data.lien_teams + "\"\n";
        } else {
            json += "\"teamslink\": \"" + null + "\"\n";
        }
        json += "},\n";
        fs.appendFile(jsonFileName, json, function(err) {
            if (err) {
                return err;
            }
        });
    }
}
module.exports = { write: write };