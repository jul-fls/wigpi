const express = require('express');
const router = express.Router();

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const difflib = require('difflib');
const root_path = process.env.root_path || process.cwd();

router.get('/', async (req, res) => {
    const htmlFilePath = root_path + "/api/routes/front/courses_data/public/courses_data_front.html";
    fs.readFile(htmlFilePath, 'utf8', function(err, data) {
        if (err) {
            res.send("error");
        } else {
            res.type('text/html');
            res.send(data);
        }
    });
});

module.exports = router;