const express = require('express');
const router = express.Router();

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const root_path = process.env.root_path || process.cwd();

router.get('/', (req, res) => {
    const json = fs.readFileSync(root_path + "/config/classes.json", 'utf8'); // Make sure to define root_path correctly
    const classes = JSON.parse(json);
    const data = { classes: [] }; // Initialize data as an object

    for(let i = 0; i < classes.length; i++){
        data.classes.push({
            name: classes[i].name,
            displayname: classes[i].displayname
        });
    }
    res.type('application/json');
    res.send(data); // This should now correctly send an object with a classes property
});

module.exports = router;