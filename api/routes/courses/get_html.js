const express = require('express');
const router = express.Router();

require('dotenv').config();
const fs = require('fs');
const path = require('path');
let root_path = process.env.root_path || process.cwd();

router.get('/:class_name', (req, res) => {
    const class_name = req.params.class_name;
    $classes = fs.readFileSync(root_path + "/api/classes.json", 'utf8');
    $classes = JSON.parse($classes);
    $status = 0;
    for (var i = 0; i < $classes.length; i++) {
        if ($status == 0) {
            if ($classes[i].name === class_name) {
                $status = 1;
                let chemin = root_path + "/htmlFiles/" + class_name + ".html";
                fs.readFile(chemin, 'utf8', function(err, data) {
                    if (err) {
                        res.send("error");
                    } else {
                        res.type('text/html');
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
    console.log("[LOG REQUEST HTML][" + $date_str + "] Requête entrante du client " + $user_agent + " avec l'ip " + $client_ip + " pour la classe \"" + class_name + "\"");
    fs.writeFile(root_path + "/logs/api_access.log", "[LOG REQUEST HTML][" + $date_str + "] Requête entrante du client " + $user_agent + " avec l'ip " + $client_ip + " pour la classe \"" + class_name + "\"\r\n", { flag: 'a+' }, (err) => {
        if (err) throw err;
    });
});

module.exports = router;