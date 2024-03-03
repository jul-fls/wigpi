require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const app = express();
const port = parseInt(process.env.API_PORT) || 3000;
let root_path = process.env.root_path || process.cwd();

app.use('/api/documentation', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/get_json/get_classes', (req, res) => {
    const json = fs.readFileSync(root_path + "/api/classes.json", 'utf8'); // Make sure to define root_path correctly
    const classes = JSON.parse(json);
    const data = { classes: [] }; // Initialize data as an object

    for(let i = 0; i < classes.length; i++){
        data.classes.push({
            name: classes[i].name,
            displayname: classes[i].displayname
        });
    }
    res.type('application/json');
    res.send(data); // This should now correctly send an object with a classes property
});

// root_path = root_path.replace("/api", "/");
app.get('/api/get_ics/:class_name', (req, res) => {
    const class_name = req.params.class_name;
    $classes = fs.readFileSync(root_path + "/api/classes.json", 'utf8');
    $classes = JSON.parse($classes);
    $status = 0;
    for (var i = 0; i < $classes.length; i++) {
        if ($status == 0) {
            if ($classes[i].name === class_name) {
                $status = 1;
                let chemin = root_path + "/icsFiles/" + class_name + ".ics";
                fs.readFile(chemin, 'utf8', function(err, data) {
                    if (err) {
                        res.send("error");
                    } else {
                        res.type('text/calendar');
                        res.send(data);
                    }
                });
            }
        } else {
            break;
        }
    }
    if ($status == 0) {
        res.send("error");
    }
    $client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    $user_agent = req.headers['user-agent'];
    $date = new Date();
    $date_str = ('0' + $date.getDate()).slice(-2) + "/" + ('0' + ($date.getMonth() + 1)).slice(-2) + "/" + $date.getFullYear() + " " + ('0' + $date.getHours()).slice(-2) + ":" + ('0' + $date.getMinutes()).slice(-2) + ":" + ('0' + $date.getSeconds()).slice(-2);
    console.log("[LOG REQUEST ICS][" + $date_str + "] Requête entrante du client " + $user_agent + " avec l'ip " + $client_ip + " pour la classe \"" + class_name + "\"");
    fs.writeFile(root_path + "/logs/api_access.log", "[LOG REQUEST ICS][" + $date_str + "] Requête entrante du client " + $user_agent + " avec l'ip " + $client_ip + " pour la classe \"" + class_name + "\"\r\n", { flag: 'a+' }, (err) => {
        if (err) throw err;
    });
});

//make the same but for jsonFiles
app.get('/api/get_json/:class_name', (req, res) => {
    const class_name = req.params.class_name;
    $classes = fs.readFileSync(root_path + "/api/classes.json", 'utf8');
    $classes = JSON.parse($classes);
    $status = 0;
    for(var i = 0; i < $classes.length; i++) {
        if($status == 0) {
            if($classes[i].name === class_name) {
                $status = 1;
                let chemin = root_path + "/jsonFiles/" + class_name + ".json";
                fs.readFile(chemin, 'utf8', function(err, data) {
                    if(err) {
                        res.send("error");
                    }else {
                        res.type('application/json');
                        res.send(data);
                    }
                });
            }
        }else{
            break;
        }
    }
    if($status == 0){
        res.send("error");
    }
    $client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    $user_agent = req.headers['user-agent'];
    $date = new Date();
    $date_str = ('0' + $date.getDate()).slice(-2) + "/" + ('0' + ($date.getMonth() + 1)).slice(-2) + "/" + $date.getFullYear() + " " + ('0' + $date.getHours()).slice(-2) + ":" + ('0' + $date.getMinutes()).slice(-2) + ":" + ('0' + $date.getSeconds()).slice(-2);
    console.log("[LOG REQUEST JSON][" + $date_str + "] Requête entrante du client " + $user_agent + " avec l'ip " + $client_ip + " pour la classe \"" + class_name + "\"");
    fs.writeFile(root_path + "/logs/api_access.log", "[LOG REQUEST JSON][" + $date_str + "] Requête entrante du client " + $user_agent + " avec l'ip " + $client_ip + " pour la classe \"" + class_name + "\"\r\n", { flag: 'a+' }, (err) => {
        if (err) throw err;
    });
});

app.get('/api/get_png/:class_name/:timestamp', (req, res) => {
    const class_name = req.params.class_name;
    $classes = fs.readFileSync(root_path + "/api/classes.json", 'utf8');
    $classes = JSON.parse($classes);
    $status = 0;
    for(var i = 0; i < $classes.length; i++){
        if($status == 0) {
            if($classes[i].name === class_name){
                $status = 1;
                let chemin = root_path + "/pngFiles/" + class_name + ".png";
                res.type('image/png');
                res.sendFile(chemin);
            }
        }else{
            break;
        }
    }
    if($status == 0){
        res.send("error");
    }
    $client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    $user_agent = req.headers['user-agent'];
    $date = new Date();
    $date_str = ('0' + $date.getDate()).slice(-2) + "/" + ('0' + ($date.getMonth() + 1)).slice(-2) + "/" + $date.getFullYear() + " " + ('0' + $date.getHours()).slice(-2) + ":" + ('0' + $date.getMinutes()).slice(-2) + ":" + ('0' + $date.getSeconds()).slice(-2);
    console.log("[LOG REQUEST PNG][" + $date_str + "] Requête entrante du client " + $user_agent + " avec l'ip " + $client_ip + " pour la classe \"" + class_name + "\"");
    fs.writeFile(root_path + "/logs/api_access.log", "[LOG REQUEST PNG][" + $date_str + "] Requête entrante du client " + $user_agent + " avec l'ip " + $client_ip + " pour la classe \"" + class_name + "\"\r\n", { flag: 'a+' }, function(err) {
        if (err) throw err;
    });
});

//create a route '/' for the home page which will render the index.html file and fill it with the classes.json file
app.get('/', (req, res) => {
    $classes = fs.readFileSync(root_path + "/api/classes.json", 'utf8');
    $classes = JSON.parse($classes);
    $html = fs.readFileSync(root_path + "/api/index.html", 'utf8');
    $data = [];
    for(var i = 0; i < $classes.length; i++){
        $data.push({
            "name": $classes[i].name,
            "displayname": $classes[i].displayname
        });
    }
    $html = $html.replace("{{classes}}", JSON.stringify($data));
    res.type('text/html');
    res.send($html);
})

app.get('/data.json', (req, res) => {
    const classesPath = path.join(root_path, "api", "classes.json");
    let classes = JSON.parse(fs.readFileSync(classesPath, 'utf8'));
    let data = {};

    classes.forEach(cls => {
        const classFilePath = path.join(root_path, "jsonFiles", `${cls.name}.json`);
        if (fs.existsSync(classFilePath)) {
            let classData = JSON.parse(fs.readFileSync(classFilePath, 'utf8'));   
            classData.forEach(courseData => {
                if (courseData.courses && courseData.courses.length > 0) {
                    courseData.courses.forEach(course => {
                        let courseName = decodeURIComponent(JSON.parse('"'+course.matiere+'"')).trim();
                        let profName = decodeURIComponent(JSON.parse('"'+course.prof+'"'));

                        if (!data[courseName]) {
                            data[courseName] = {
                                subject: courseName,
                                teachers: [],
                                hours: { planned: 0, realized: 0, percentage: "0" },
                                onGoing: false,
                                timespan: { start: "", end: "" },
                                nb: 0
                            };
                        }
                        let startTime = new Date(course.dtstart);
                        let endTime = new Date(course.dtend);
                        let courseDuration = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
                        
                        if (!data[courseName].teachers.includes(profName)) {
                            data[courseName].teachers.push(profName);
                        }
                        data[courseName].hours.planned += courseDuration;
                        data[courseName].hours.realized += courseDuration; // Assuming all planned hours are realized
                        data[courseName].nb += 1;

                        // Update timespan
                        let courseStartDate = course.dtstart.substring(0, 8);
                        let courseEndDate = course.dtend.substring(0, 8);
                        if (!data[courseName].timespan.start || data[courseName].timespan.start > courseStartDate) {
                            data[courseName].timespan.start = courseStartDate;
                        }
                        if (!data[courseName].timespan.end || data[courseName].timespan.end < courseEndDate) {
                            data[courseName].timespan.end = courseEndDate;
                        }
                    });

                    // Finalize data for each course
                    for (let key in data) {
                        let course = data[key];
                        let percentage = (course.hours.realized / course.hours.planned) * 100;
                        course.hours.percentage = `${percentage.toFixed(0)}%`;
                        course.onGoing = percentage < 100;

                        // Format timespan dates
                        course.timespan.start = formatDateTime(course.timespan.start);
                        course.timespan.end = formatDateTime(course.timespan.end);
                    }
                }
            });
        }
    });

    res.json(data);
});

function parseDateTime(dateTimeStr) {
    // Parses dateTimeStr in "YYYYMMDDTHHMMSS" format to Date
    const year = parseInt(dateTimeStr.substring(0, 4), 10);
    const month = parseInt(dateTimeStr.substring(4, 6), 10) - 1; // JS months are 0-indexed
    const day = parseInt(dateTimeStr.substring(6, 8), 10);
    const hour = parseInt(dateTimeStr.substring(9, 11), 10);
    const minute = parseInt(dateTimeStr.substring(11, 13), 10);
    const second = parseInt(dateTimeStr.substring(13, 15), 10);
    return new Date(year, month, day, hour, minute, second);
}

function formatDateTime(dateTimeStr) {
    // Formats dateTimeStr from "YYYYMMDDTHHMMSS" to "DD/MM/YYYY"
    const date = parseDateTime(dateTimeStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}


app.listen(port, () => {
    console.log(`Wigpi api is listening at http://localhost:${port}/api`)
})