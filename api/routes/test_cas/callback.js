const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const parseString = require('xml2js').parseString;

require('dotenv').config();
const fs = require('fs');
const path = require('path');

router.get('/', async (req, res) => {
    const ticket = req.query.ticket;
    const service = encodeURIComponent("https://wigpi.flusin.fr/api/test_cas/callback");
    const validateUrl = `https://cas-p.wigorservices.net/cas/serviceValidate?ticket=${ticket}&service=${service}`;

    if (ticket && service) {
        try {
            const response = await fetch(validateUrl);
            const data = await response.text();
            parseString(data, (err, result) => {
                if (err) {
                    res.send("Error parsing the response");
                } else {
                    res.send(result);
                }
            });
        } catch (error) {
            res.send("Error validating the ticket: " + error.message);
        }
    } else {
        res.send("Missing ticket or service parameter");
    }
});

module.exports = router;
