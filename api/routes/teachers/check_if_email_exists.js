const express = require('express');
const router = express.Router();

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const miscLib = require('../../../libs/miscLib');

router.get('/:email', async (req, res) => {
    const email = req.params.email;
    let data = { "exists": false }; // Initialize data as an object
    // Check if the email exists
    const emailExists = await miscLib.check_if_o365_user_exists(email);
    if (emailExists) {
        data.exists = true; // Set the exists property to true if the email exists
    }
    
    res.type('application/json');
    res.send(data); // This should now correctly send an object with a classes property
});

module.exports = router;