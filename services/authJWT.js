const fs = require('fs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

async function authenticateWithJWT() {
  const privateKey = fs.readFileSync('server.key', 'utf8');

  const token = jwt.sign(
    {
      iss: process.env.SF_CLIENT_ID,       // Connected App's Consumer Key
      sub: process.env.SF_JWT_USERNAME,    // Integration user's email
      aud: process.env.SF_LOGIN_URL,
      exp: Math.floor(Date.now() / 1000) + 60 // 1-minute expiration
    },
    privateKey,
    { algorithm: 'RS256' }
  );

  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', token);

  const response = await axios.post(
    `${process.env.SF_LOGIN_URL}/services/oauth2/token`,
    params
  );

  return {
    accessToken: response.data.access_token,
    instanceUrl: response.data.instance_url
  };
}

// Example usage
authenticateWithJWT()
  .then(auth => {
    console.log('✅ Access token received!');
    console.log('Access Token:', auth.accessToken);
    console.log('Instance URL:', auth.instanceUrl);
  })
  .catch(err => {
    console.error('❌ JWT Auth Error:', err.response?.data || err.message);
  });


  module.exports = { authenticateWithJWT };