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

    for(let i = 0; i < classes.length; i++){
        data.classes.push({
            name: classes[i].name,
            displayname: classes[i].displayname
        });
    }
    
    res.type('application/json');
    res.send(data);
});

module.exports = router;