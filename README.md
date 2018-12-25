# THE LOG IN FROM THE VPS SERVER IS NOT WORKING BECAUSE OF THE PIN SECURITY OF LINKEDIN, HENCE LOCAL COOKIES FILE MUST BE COPIED TO THE VPS SERVER TO SKIP THE AUTHENTIFICATION PROCESS

## Installation

```bash
git clone https://github.com/Cooya/Linkedin.git
cd Linkedin
npm install
sudo npm install -g forever
npm run build
touch server/assets/config.js
touch server/assets/cookies.json
npm run server
```

It may need Linux dependencies to run Chromium :
```
sudo apt install gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

## Get the access token

* ask for the user authorization by requesting https://www.linkedin.com/oauth/v2/authorization with GET parameters :
```json
{
    "response_type": "code",
    "client_id": "your_client_id",
    "redirect_uri": "your_callback",
    "state": "random_string"
}
```
* submit the form
* then you will be redirected to the specified callback with a code in GET parameters
* exchange this code with an access token by requesting https://www.linkedin.com/oauth/v2/accessToken with POST parameters :
```json
{
    "grant_type": "authorization_code",
    "code": "your_code",
    "redirect_uri": "your_callback",
    "client_id": "your_client_id",
    "client_secret": "your_client_secret"
}
```
* you will get a JSON object with an access token valid for two months and its expiration date

## Architecture

The daemon is used to take a list of people or company to process in input and save the returned data into the database.  
The server is used to display a simple web interface allowing to submit Linkedin people profile or company page to scrap.
