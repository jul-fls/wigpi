const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const paths = require('../../../config/paths');

router.get('/:class_name/:timestamp', (req, res) => {
    const class_name = req.params.class_name;
    const $classes = JSON.parse(fs.readFileSync(path.join(paths.config, 'classes.json'), 'utf8'));
    let $status = 0;

    for (const classItem of $classes) {
        if ($status == 0) {
            if (classItem.name === class_name) {
                $status = 1;
                const pngFilePath = path.join(paths.output.png, `${class_name}.png`);
                res.type('image/png');
                res.sendFile(pngFilePath);
            }
        } else {
            break;
        }
    }

    if($status == 0) {
        res.send("error");
    }

    // Logging
    const $client_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const $user_agent = req.headers['user-agent'];
    const $date = new Date();
    const $date_str = ('0' + $date.getDate()).slice(-2) + "/" + 
                     ('0' + ($date.getMonth() + 1)).slice(-2) + "/" + 
                     $date.getFullYear() + " " + 
                     ('0' + $date.getHours()).slice(-2) + ":" + 
                     ('0' + $date.getMinutes()).slice(-2) + ":" + 
                     ('0' + $date.getSeconds()).slice(-2);

    console.log(`[LOG REQUEST PNG][${$date_str}] Requête entrante du client ${$user_agent} avec l'ip ${$client_ip} pour la classe "${class_name}"`);
    
    fs.writeFile(
        path.join(paths.logs, 'api_access.log'),
        `[LOG REQUEST PNG][${$date_str}] Requête entrante du client ${$user_agent} avec l'ip ${$client_ip} pour la classe "${class_name}"\r\n`,
        { flag: 'a+' },
        (err) => {
            if (err) throw err;
        }
    );
});

module.exports = router;