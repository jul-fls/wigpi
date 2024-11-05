const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { postEDTForAllClasses } = require('../../../discord_webhook/post_edt'); // Import the function

require('dotenv').config();

// Load API keys
const apiKeysFilePath = path.join(process.env.ROOT_PATH || process.cwd(), 'config/apiKeys.json');
const apiKeys = JSON.parse(fs.readFileSync(apiKeysFilePath, 'utf8'));

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

    // Check if the task is already in progress by reading the lock file
    const lockFilePath = path.join(process.env.ROOT_PATH || process.cwd(), 'output/lockFiles/post_edt.lock');
    if (fs.existsSync(lockFilePath)) {
        const lockState = fs.readFileSync(lockFilePath, 'utf8').trim();
        if (lockState === '1') {
            return res.status(409).json({ error: 'Post EDT already in progress' });
        }
    }

    // Log the incoming request
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const date = new Date();
    const dateStr = date.toLocaleString('fr-FR', { hour12: false });

    const logMessage = `[LOG REQUEST POST EDT][${dateStr}] Request from IP ${clientIp}, User-Agent ${userAgent} with API key: ${apiKey}\n`;
    fs.appendFile(path.join(process.env.ROOT_PATH || process.cwd(), 'logs/api_access.log'), logMessage, (err) => {
        if (err) {
            console.error("Failed to write log:", err);
        }
    });

    // Respond immediately to the client
    res.json({ message: 'Post EDT triggered successfully' });

    // Run the post_edt function asynchronously after sending the response
    setImmediate(async () => {
        // Redirect logs to post_edt.log
        const restoreConsole = redirectLogsToFile(path.join(process.env.ROOT_PATH || process.cwd(), 'logs/post_edt.log'));

        // Set the lock to prevent another refresh while this one is in progress
        fs.writeFileSync(lockFilePath, '1');

        try {
            await postEDTForAllClasses();
        } catch (error) {
            console.error('Error during post EDT:', error);
        } finally {
            // Unlock after the process is finished
            fs.writeFileSync(lockFilePath, '0');
        }

        // Restore original console.log behavior
        restoreConsole();
    });
});

module.exports = router;
