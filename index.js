const path = require('path');
const fs = require('fs');
const { authenticateWithJWT } = require('./services/authJWT');
const { uploadFileToSalesforce } = require('./services/uploadFile');

const folderPath = path.join(__dirname, 'FileToUpload');

(async () => {
  try {
    // Step 1: Get access token
    const { accessToken, instanceUrl } = await authenticateWithJWT();

    // Step 2: Read the first file from FileToUpload folder
    const caseIdRegex = /[0-9a-zA-Z]{18}/;
    
    const files = fs.readdirSync(folderPath).filter(f => {
    const match = f.match(caseIdRegex);
    return match !== null;
    });
    if (files.length === 0) {
      console.log('❌ No CSV files found in FileToUpload folder.');
      return;
    }

    const filePath = path.join(folderPath, files[0]);
    const caseId = '5002800000qEQNNAA4'; // 🔁 TODO: dynamically get this if needed

    // Step 3: Upload the file and link to the Case
    await uploadFileToSalesforce(filePath, accessToken, instanceUrl, caseId);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
