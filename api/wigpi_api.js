require('dotenv').config();
const fs = require('fs');
const express = require('express');
const app = express();
const port = parseInt(process.env.API_PORT) || 3000;
app.get('/api/get_ics/:class_name', (req, res) => {
    const class_name = req.params.class_name;
    $classes = fs.readFileSync(process.env.ROOT_PATH+"/api/classes.json", 'utf8');
    $classes = JSON.parse($classes);
    $status = 0;
    for(var i = 0; i < $classes.length; i++) {
        if($status == 0) {
            if($classes[i].name == class_name) {
                $status = 1;
                let chemin = process.env.ROOT_PATH+"icsFiles/" + class_name + ".ics";
                fs.readFile(chemin, 'utf8', function(err, data) {
                    if (err) {
                        res.send("error");
                    } else {
                        res.send(data);
                    }
                });
            }
        }else{
            break;
        }
    }
    if($status == 0) {
        res.send("error");
    }
    $client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    $user_agent = req.headers['user-agent'];
    $date = new Date();
    $date_str = ('0' + $date.getDate()).slice(-2) + "/" + ('0' + ($date.getMonth() + 1)).slice(-2) + "/" + $date.getFullYear() + " " + ('0' + $date.getHours()).slice(-2) + ":" + ('0' + $date.getMinutes()).slice(-2) + ":" + ('0' + $date.getSeconds()).slice(-2);
    console.log("[LOG REQUEST ICS]["+$date_str+"] Requête entrante du client " + $user_agent + " avec l'ip " + $client_ip + " pour la classe \"" + class_name+ "\"");
    fs.writeFile(process.env.ROOT_PATH+"logs/api_access.log", "[LOG REQUEST ICS]["+$date_str+"] Requête entrante du client " + $user_agent + " avec l'ip " + $client_ip + " pour la classe \"" + class_name+ "\"\r\n", 
    { flag: 'a+' }, (err) => {
        if (err) throw err;
    });
});

app.get('/api/get_png/:class_name', (req, res) => {
    const class_name = req.params.class_name;
    $classes = fs.readFileSync(process.env.ROOT_PATH+"/api/classes.json", 'utf8');
    $classes = JSON.parse($classes);
    $status = 0;
    for(var i = 0; i < $classes.length; i++) {
        if($status == 0) {
            if($classes[i].name == class_name) {
                $status = 1;
                let chemin = process.env.ROOT_PATH+"pngFiles/" + class_name + ".png";
                res.sendFile(chemin);
            }
        }else{
            break;
        }
    }
    if($status == 0) {
        res.send("error");
    }
    $client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    $user_agent = req.headers['user-agent'];
    $date = new Date();
    $date_str = ('0' + $date.getDate()).slice(-2) + "/" + ('0' + ($date.getMonth() + 1)).slice(-2) + "/" + $date.getFullYear() + " " + ('0' + $date.getHours()).slice(-2) + ":" + ('0' + $date.getMinutes()).slice(-2) + ":" + ('0' + $date.getSeconds()).slice(-2);
    console.log("[LOG REQUEST PNG]["+$date_str+"] Requête entrante du client " + $user_agent + " avec l'ip " + $client_ip + " pour la classe \"" + class_name+ "\"");
    fs.writeFile(process.env.ROOT_PATH+"logs/api_access.log", "[LOG REQUEST PNG]["+$date_str+"] Requête entrante du client " + $user_agent + " avec l'ip " + $client_ip + " pour la classe \"" + class_name+ "\"\r\n",
    { flag: 'a+' }, function (err) {
        if (err) throw err;
    });
});

//create a route '/' for the home page which will render the index.html file and fill it with the classes.json file
app.get('/', (req, res) => {
    $classes = fs.readFileSync(process.env.ROOT_PATH+"/api/classes.json", 'utf8');
    $classes = JSON.parse($classes);
    $html = fs.readFileSync(process.env.ROOT_PATH+"/api/index.html", 'utf8');
    // $html = $html.replace("{{classes}}", JSON.stringify($classes));
    //modify to only send name and displayname, the other data are sensitive
    $data = [];
    for(var i = 0; i < $classes.length; i++) {
        $data.push({
            "name": $classes[i].name,
            "displayname": $classes[i].displayname
        });
    }
    $html = $html.replace("{{classes}}", JSON.stringify($data));
    res.send($html);
})

app.listen(port, () => {
    console.log(`Wigpi api is listening at http://localhost:${port}/api`)
})