const fetch = (...args) =>
    import ('node-fetch').then(({ default: fetch }) => fetch(...args));

function EpsiNameToEmail(name) {
    // if name is less than 5 characters or is empty, return an empty string
    if (name.length < 5 || !name) {
        return "";
    }
    const mailDomains = {
        "@mail-formateur.net": [],
        "@reseau-cd.fr": ["guerineau", "hivert", "sauvage"],
        "@reseau-cd.com": ["abadiebiscay"],
        "@campus-cd.com": ["berthellot", "eiche", "jambor", "perrin", "lelan", "garcia", "bermond"],
    };
    const predeterminedEmails = {
        // Pattern: "part of name": "predetermined email"
        "graffin": "marie-sophie.graffin@bordeaux-epsi.fr"
        // Add other exceptions here as needed
    };

    let emailParts = name.split(" ");
    let firstName = emailParts.pop().toLowerCase(); // Always the last part
    let lastNameParts = emailParts.map(part => part.replace(/-/g, "").toLowerCase());
    let lastName = lastNameParts.join('');
    let mailDomain = "@mail-formateur.net"; // Default domain

    // Dynamically determine if the profName matches any predetermined email exceptions
    let matchedException = lastNameParts.find(part => predeterminedEmails.hasOwnProperty(part));
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
    if (lastNameParts.length === 1 && (firstName+"."+lastName).length<22) {
        // If there's only one part in the last name
        profEmail = `${firstName}.${lastName}${mailDomain}`;
    } else if(lastNameParts.length === 1 && (firstName+"."+lastName).length>=22){
        // If the last name has two or three parts
        profEmail = `${firstName.charAt(0)}.${lastName}${mailDomain}`;
    } else if(lastNameParts.length === 2){
        // If the last name has two or three parts
        profEmail = `${firstName}.${lastName}${mailDomain}`;
    } else if(lastNameParts.length >= 3){
        profEmail = `${lastNameParts[1].charAt(0)}.${lastNameParts[0]}${mailDomain}`;
    }else{
        profEmail = "";
    }
    // before returning, check if the email is valid against the O365 API
    // const emailExists = await check_if_o365_user_exists(profEmail);
    return profEmail;
    // if (!emailExists) {
    //     // If the email is invalid, return an empty string
    //     return "";
    // }else{
    //     return profEmail;
    // }
}

async function check_if_o365_user_exists(email){
    const url = "https://login.microsoftonline.com/common/GetCredentialType?mkt=fr-FR";
    const body = {"Username":email};
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    const data = await response.json();
    return data.IfExistsResult;
}

module.exports = {
    EpsiNameToEmail,
    check_if_o365_user_exists
};