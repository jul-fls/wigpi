const express = require('express');
const router = express.Router();

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const difflib = require('difflib');
const moment = require('moment-timezone');
let root_path = process.env.root_path || process.cwd();

router.get('/', (req, res) => {
    $classes = fs.readFileSync(root_path + "/api/classes.json", 'utf8');
    $classes = JSON.parse($classes);
    $html = fs.readFileSync(root_path + "/api/routes/front/homepage/index.html", 'utf8');
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


module.exports = router;