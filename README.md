# Mumbot
Mumbot is a bot made for the Mumble voice chat client using Node.js

####Installation and Setup 
To install all necessary dependencies for this project, run this command:  
```
npm install  
```

If you do not have them already, generate Mumble certificates with:  
Key: 
```
openssl pkcs12 -in MumbleCertificate.p12 -out key.pem -nocerts -nodes  
```
Cert: 
```
openssl pkcs12 -in MumbleCertificate.p12 -out crt.pem -clcerts -nokeys  
```

In the beggining of **app.js**, change the options to point to your key and certificate files. Also, change the **serverURL** and **username** variables to the ones associated with your certificate.

Start the server with:  
```
node app.js  
```