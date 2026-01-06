const fs = require('fs');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');
require('dotenv').config();

async function authenticateSF() {
  const privateKey = fs.readFileSync('server.key', 'utf8');

  const token = jwt.sign(
    {
      iss: process.env.SF_CLIENT_ID,
      sub: process.env.SF_JWT_USERNAME,
      aud: process.env.SF_LOGIN_URL,
      exp: Math.floor(Date.now() / 1000) + 60
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

async function uploadSmallFile(filePath, fileName, sfAuth) {
  const fileBody = fs.readFileSync(filePath).toString('base64');
  const response = await axios.post(
    `${sfAuth.instanceUrl}/services/data/v59.0/sobjects/ContentVersion`,
    {
      Title: fileName,
      PathOnClient: fileName,
      VersionData: fileBody
    },
    {
      headers: {
        Authorization: `Bearer ${sfAuth.accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.id;
}

async function uploadLargeFile(filePath, fileName, sfAuth) {
  const form = new FormData();
  form.append('entity_content', JSON.stringify({
    Title: fileName,
    PathOnClient: fileName
  }), {
    contentType: 'application/json'
  });
  form.append('VersionData', fs.createReadStream(filePath));

  const headers = {
    ...form.getHeaders(),
    Authorization: `Bearer ${sfAuth.accessToken}`
  };

  const response = await axios.post(
    `${sfAuth.instanceUrl}/services/data/v59.0/sobjects/ContentVersion`,
    form,
    { headers }
  );

  return response.data.id;
}

async function linkFileToRecord(sfAuth, contentVersionId, linkedEntityId) {
  const versionResp = await axios.get(
    `${sfAuth.instanceUrl}/services/data/v59.0/sobjects/ContentVersion/${contentVersionId}`,
    {
      headers: { Authorization: `Bearer ${sfAuth.accessToken}` }
    }
  );

  const contentDocumentId = versionResp.data.ContentDocumentId;

  await axios.post(
    `${sfAuth.instanceUrl}/services/data/v59.0/sobjects/ContentDocumentLink`,
    {
      ContentDocumentId: contentDocumentId,
      LinkedEntityId: linkedEntityId,
      ShareType: 'V'
    },
    {
      headers: {
        Authorization: `Bearer ${sfAuth.accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
}

(async () => {
  try {
    const folderPath = path.join(__dirname, '../FileToUpload');
    const sfAuth = await authenticateSF();

    const files = fs.readdirSync(folderPath).filter(f => /500[a-zA-Z0-9]{15}/.test(f));
    if (files.length === 0) {
      console.log('❌ No files found with Case ID in filename.');
      return;
    }

    for (const fileName of files) {
      try {
        const filePath = path.join(folderPath, fileName);
        const caseIdMatch = fileName.match(/500[a-zA-Z0-9]{15}/);
        if (!caseIdMatch) {
          console.log(`❌ Skipping '${fileName}' — no valid Case ID.`);
          continue;
        }

        const caseId = caseIdMatch[0];
        const fileStats = fs.statSync(filePath);
        const fileSizeMB = fileStats.size / (1024 * 1024);
        let contentVersionId;

        console.log(`📁 Uploading '${fileName}' (${fileSizeMB.toFixed(2)} MB) → Case ID: ${caseId}`);

        if (fileSizeMB < 35) {
          contentVersionId = await uploadSmallFile(filePath, fileName, sfAuth);
        } else {
          contentVersionId = await uploadLargeFile(filePath, fileName, sfAuth);
        }

        await linkFileToRecord(sfAuth, contentVersionId, caseId);
        console.log(`✅ Uploaded and linked '${fileName}' to Case ${caseId}`);
      } catch (fileErr) {
        console.error(`❌ Error processing '${fileName}':`, fileErr.message);
      }
    }
  } catch (err) {
    console.error('❌ Global Error:', err.message);
  }
})();
