const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const paths = require('../../../../config/paths');

router.get('/', async (req, res) => {
    const htmlFilePath = path.join(paths.api.routes, 'front', 'courses_data', 'public', 'courses_data_front.html');
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