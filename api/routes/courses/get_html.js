const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const paths = require('../../../config/paths');

router.get('/:class_name', (req, res) => {
    const class_name = req.params.class_name;
    const $classes = JSON.parse(fs.readFileSync(path.join(paths.config, 'classes.json'), 'utf8'));
    let $status = 0;

    for (const classItem of $classes) {
        if ($status == 0) {
            if (classItem.name === class_name) {
                $status = 1;
                const jsonFilePath = path.join(paths.output.json, `${class_name}.json`);
                fs.readFile(jsonFilePath, 'utf8', function(err, data) {
                    if (err) {
                        res.send("error");
                    } else {
                        const jsonData = JSON.parse(data);
                        let htmlContent = `
                            <html>
                                <head>
                                    <title>${jsonData.info.classname}</title>
                                </head>
                                <body>
                                    <h1>${jsonData.info.classname}</h1>
                                    <p>${jsonData.info.description}</p>
                                    <ul>
                        `;

                        jsonData.courses.forEach(course => {
                            htmlContent += `
                                <li>
                                    <strong>Subject:</strong> ${course.matiere} <br>
                                    <strong>Professor:</strong> ${course.prof.name} (${course.prof.email})<br>
                                    <strong>Start:</strong> ${course.dtstart} <br>
                                    <strong>End:</strong> ${course.dtend} <br>
                                    <strong>Location:</strong> ${course.salle}, Building: ${course.batiment}<br>
                                    <strong>Visio:</strong> ${course.visio ? 'Yes' : 'No'}<br>
                                </li>
                                <hr>
                            `;
                        });

                        htmlContent += `
                                    </ul>
                                </body>
                            </html>
                        `;

                        res.send(htmlContent);
                    }
                });
            }
        } else {
            break;
        }
    }

    if($status == 0){
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
        `[LOG REQUEST JSON][${$date_str}] Requête entrante du client ${$user_agent} avec l'ip ${$client_ip} pour la classe "${class_name}"
`,
        { flag: 'a+' },
        (err) => {
            if (err) throw err;
        }
    );
});

module.exports = router;
