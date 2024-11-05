const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const paths = require('../../../config/paths');

router.get('/:class_name', (req, res) => {
    const class_name = req.params.class_name;
    const $classes = JSON.parse(fs.readFileSync(path.join(paths.config, 'classes.json'), 'utf8'));
    let $status = 0;

    for (let i = 0; i < $classes.length; i++) {
        if ($status == 0) {
            if ($classes[i].name === class_name) {
                $status = 1;
                const htmlFilePath = path.join(paths.output.html, `${class_name}.html`);
                fs.readFile(htmlFilePath, 'utf8', function(err, data) {
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

    console.log(`[LOG REQUEST HTML][${$date_str}] Requête entrante du client ${$user_agent} avec l'ip ${$client_ip} pour la classe "${class_name}"`);
    
    fs.writeFile(
        path.join(paths.logs, 'api_access.log'),
        `[LOG REQUEST HTML][${$date_str}] Requête entrante du client ${$user_agent} avec l'ip ${$client_ip} pour la classe "${class_name}"\r\n`,
        { flag: 'a+' },
        (err) => {
            if (err) throw err;
        }
    );
});

module.exports = router;