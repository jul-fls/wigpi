const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const paths = require('../../../../config/paths');

router.get('/', (req, res) => {
    const classes = JSON.parse(fs.readFileSync(path.join(paths.config, 'classes.json'), 'utf8'));
    const html = fs.readFileSync(path.join(paths.api.routes, 'front', 'homepage', 'index.html'), 'utf8');
    
    const data = classes.map(classItem => ({
        name: classItem.name,
        displayname: classItem.displayname
    }));

    const processedHtml = html.replace("{{classes}}", JSON.stringify(data));
    res.type('text/html');
    res.send(processedHtml);
});

module.exports = router;