const express = require('express');
const router = express.Router();

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const difflib = require('difflib');
const moment = require('moment-timezone');
let root_path = process.env.root_path || process.cwd();

router.get('/:class_name', async (req, res) => {
    const class_name = req.params.class_name;
    $classes = fs.readFileSync(root_path + "/api/classes.json", 'utf8');
    $classes = JSON.parse($classes);
    $status = 0;

    for (var i = 0; i < $classes.length; i++) {
        if ($status != 0) {
            break;
        }else{
            if ($classes[i].name === class_name) {
                $status = 1;
                res.status(200).json({message: "Class found"});
            }else{
                res.status(404).json({message: "Class not found"});
            }
        }
    }
});

module.exports = router;