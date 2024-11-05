const fetch = (...args) =>
    import ('node-fetch').then(({ default: fetch }) => fetch(...args));

function normalizeString(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const MAX_RETRIES = parseInt(process.env.MS_ONLINE_MAX_RETRIES, 10) || 3;

async function EpsiNameToEmail(name) {
    // if name is less than 5 characters or is empty, return an empty string
    if (name.length < 5 || !name) {
        return "";
    }
    const max_characters_threshold = 20;
    const mailDomains = {
        "@mail-formateur.net": [],
        "@reseau-cd.fr": ["hivert"],
        "@reseau-cd.com": ["abadiebiscay"],
        "@campus-cd.com": ["eiche", "jambor", "lelan", "garcia", "bermond","chesneau"],
    };
    const predeterminedEmails = {
        // Pattern: "part of name": "predetermined email"
        "graffin": "marie-sophie.graffin@bordeaux-epsi.fr",
        "toix": "florian.toix1@mail-formateur.net",
        "ladrat": "geoffroy.ladrat1@mail-formateur.net",
        "pichon": "olivier.pichon1@mail-formteur.net",
        "berthellot": "laura.berthellot1@campus-cd.com",
    };

    // Normalize the name to remove accents
    name = normalizeString(name);
    name = name.toLowerCase()

    const emailParts = name.split(" ");
    const firstName = emailParts.pop(); // Always the last part
    const lastNameParts = emailParts.map(part => part.replace(/-/g, "").toLowerCase());
    const lastName = lastNameParts.join('');
    let mailDomain = "@mail-formateur.net"; // Default domain

    // Dynamically determine if the profName matches any predetermined email exceptions
    const matchedException = lastNameParts.find(part => predeterminedEmails.hasOwnProperty(part));
    if (matchedException) {
        return predeterminedEmails[matchedException]; // Return the predetermined email if match found
    }

    // Determine the appropriate domain based on last name parts
    Object.entries(mailDomains).forEach(([domain, names]) => {
        lastNameParts.forEach(part => {
            if (names.includes(part)) {
                mailDomain = domain;
            }
        });
    });

    let profEmail;
    if (lastNameParts.length === 1 && (firstName+"."+lastName).length<max_characters_threshold) {
        // If there's only one part in the last name
        profEmail = `${firstName}.${lastName}${mailDomain}`;
    } else if(lastNameParts.length === 1 && (firstName+"."+lastName).length>=max_characters_threshold){
        // If the last name has two or three parts
        profEmail = `${firstName.charAt(0)}.${lastName}${mailDomain}`;
    } else if(lastNameParts.length === 2 && (firstName+"."+lastName).length<max_characters_threshold){
        // If the last name has two or three parts
        profEmail = `${firstName}.${lastName}${mailDomain}`;
    } else if(lastNameParts.length === 2 && (firstName+"."+lastName).length>=max_characters_threshold){
        // If the last name has two or three parts
        profEmail = `${lastNameParts[1].charAt(0)}.${lastNameParts[0]}${mailDomain}`;
    } else if(lastNameParts.length >= 3){
        profEmail = `${lastNameParts[1].charAt(0)}.${lastNameParts[0]}${mailDomain}`;
    }else{
        profEmail = "";
    }
    // before returning, check if the email is valid against the O365 API
    const emailExists = await check_if_o365_user_exists(profEmail);
    // return profEmail;
    if (!emailExists) {
        // If the email is invalid, return an empty string
        return "";
    }else{
        return profEmail;
    }
}

// Implement retry mechanism for Microsoft Online request
async function check_if_o365_user_exists(email, retries = MAX_RETRIES) {
    const url = "https://login.microsoftonline.com/common/GetCredentialType?mkt=fr-FR";
    const body = { "Username": email };

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Attempt ${attempt}: Checking if O365 user exists for ${email}...`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            return !data.IfExistsResult; // Return true if the user exists, false otherwise
        } catch (error) {
            if (attempt < retries) {
                console.warn(`Attempt ${attempt} failed. Retrying...`);
            } else {
                console.error('Max retries reached. Failed to check O365 user existence.');
                throw new Error('Failed to check O365 user existence after maximum retries');
            }
        }
    }
}

async function getCookiesForUser(user) {
    const url = process.env.AUTH_SERVICE_URL;
    const requestBody = {
        username: user.username,
        password: user.password
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const responseBody = await response.json();

        if (responseBody.status === "success") {
            console.log("Cookies récupérés pour l'utilisateur " + user.username);
            return responseBody.data.cookies; // Return cookies directly
        } else {
            console.error("Erreur lors de la récupération des cookies pour l'utilisateur " + user.username, responseBody);
            return null;
        }
    } catch (error) {
        console.error('Une erreur s\'est produite lors de l\'accès à l\'url ' + url + "\nErreur: " + error);
        return null;
    }
}

module.exports = {
    EpsiNameToEmail,
    check_if_o365_user_exists,
    getCookiesForUser
};