# THE LOG IN FROM THE VPS SERVER IS NOT WORKING BECAUSE OF THE PIN SECURITY OF LINKEDIN
# MY LOCAL COOKIES FILE MUST BE COPIED TO THE VPS SERVER TO SKIP THE AUTHENTIFICATION PROCESS

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
