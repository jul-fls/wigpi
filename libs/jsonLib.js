const fs = require('fs');

function start(class_displayname) {
    const json = "{\"info\":{\n" +
    "\"timestamp\": \"" + Date.now() + "\",\n" +
    "\"classname\": \"" + class_displayname + "\",\n" +
    "\"description\": \"Emploi du temps des cours des " + class_displayname + "\"\n},\"courses\": [\n";
    return json;
}

function end() {
    const json = "\n]\n}";
    return json;
}

function write(type, data, jsonFileName) {
    if (type == "start") {
        const json = start(data);
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
        const json = "{\n" +
        "\"uid\": \"" + data.uid + "\",\n" +
        "\"dtstart\": \"" + data.dtstart + "\",\n" +
        "\"dtend\": \"" + data.dtend + "\",\n" +
        "\"matiere\": \"" + data.matiere + "\",\n" +
        "\"prof\": {\"name\":\"" + data.prof.name + "\",\"email\":\"" + data.prof.email + "\"},\n" +
        "\"salle\": \"" + data.salle + "\",\n" +
        "\"batiment\": \"" + data.batiment + "\",\n" +
        "\"visio\": " + data.visio + ",\n" +
        "},\n";
        fs.appendFile(jsonFileName, json, function(err) {
            if (err) {
                return err;
            }
        });
    }
}
module.exports = { write: write };