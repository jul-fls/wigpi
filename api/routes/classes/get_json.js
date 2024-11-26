const express = require('express');
const router = express.Router();

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const paths = require('../../../config/paths');

router.get('/', (req, res) => {
    const json = fs.readFileSync(path.join(paths.config, 'classes.json'), 'utf8');
    const classes = JSON.parse(json);
    const data = { classes: [] };

    for (const classItem of classes) {
        data.classes.push({
            name: classItem.name,
            displayname: classItem.displayname
        });
    }
    
    res.type('application/json');
    res.send(data);
});

module.exports = router;