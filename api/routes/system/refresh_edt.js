const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { refreshEDT } = require('../../../main'); // Import the refreshEDT function

require('dotenv').config();

// Load API keys
const apiKeysFilePath = path.join(process.env.ROOT_PATH || process.cwd(), 'config/apiKeys.json');
let apiKeys = JSON.parse(fs.readFileSync(apiKeysFilePath, 'utf8'));

// Function to redirect logs to a specific file
function redirectLogsToFile(logFilePath) {
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    // Override console.log to only write to the log file
    console.log = (...args) => {
        const message = args.join(' ') + '\n';
        logStream.write(message); // Only write to the log file, not the console
    };

    // Return a cleanup function to restore original console.log
    return () => {
        console.log = (...args) => {
            process.stdout.write(args.join(' ') + '\n'); // Restore original console.log behavior
        };
        logStream.end();
    };
}

router.get('/', (req, res) => {
    const apiKey = req.query.apiKey;

    // Check if the API key exists and is active
    const validKey = apiKeys.keys.find(key => key.value === apiKey && key.status === 'active');
    if (!validKey) {
        return res.status(403).json({ error: 'Invalid or inactive API key' });
    }

    // Check if the refresh is already in progress by reading the lock file
    const lockFilePath = path.join(process.env.ROOT_PATH || process.cwd(), 'output/lockFiles/refresh.lock');
    if (fs.existsSync(lockFilePath)) {
        const lockState = fs.readFileSync(lockFilePath, 'utf8').trim();
        if (lockState === '1') {
            return res.status(409).json({ error: 'Refresh already in progress' });
        }
    }

    // Log the incoming request
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const date = new Date();
    const dateStr = date.toLocaleString('fr-FR', { hour12: false });

    const logMessage = `[LOG REQUEST REFRESH EDT][${dateStr}] Request from IP ${clientIp}, User-Agent ${userAgent} with API key: ${apiKey}\n`;
    fs.appendFile(path.join(process.env.ROOT_PATH || process.cwd(), 'logs/api_access.log'), logMessage, (err) => {
        if (err) {
            console.error("Failed to write log:", err);
        }
    });

    // Respond immediately to the client
    res.json({ message: 'EDT refresh triggered successfully' });

    // Run the refresh asynchronously after sending the response
    setImmediate(async () => {
        // Redirect logs to create_ics.log
        const restoreConsole = redirectLogsToFile(path.join(process.env.ROOT_PATH || process.cwd(), 'logs/create_ics.log'));

        try {
            await refreshEDT();
        } catch (error) {
            console.error('Error during EDT refresh:', error);
        }

        // Restore original console.log behavior
        restoreConsole();
    });
});

module.exports = router;
