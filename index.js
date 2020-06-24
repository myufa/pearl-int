const AWS = require('aws-sdk');
const axios = require('axios');
const fs = require('fs');
const vision = require('@google-cloud/vision');


const config = JSON.parse(fs.readFileSync('gcp.json'));

async function getLabel(mediaUrl) {
  // Get buffer of twilio image file
  const response = await axios.get(mediaUrl,  { responseType: 'arraybuffer' });
  const media = Buffer.from(response.data, "utf-8");

  // Get google vision predicted label
  const googleClient = new vision.ImageAnnotatorClient({ projectId: config.project_id, credentials: { client_email: config.client_email, private_key: config.private_key } });
  const request = {
    image: {
      content: media
    }
  };
  const [result] = await googleClient.objectLocalization(request);
  const objects = result.localizedObjectAnnotations;
  const label = [];
  console.log("objects", objects.length);
  if(objects.length === 0) return "No idea what this is";
  objects.forEach(object => {
    label.push(object.name);
    console.log(`Google Name: ${object.name}`);
    console.log(`Confidence: ${object.score}`);
  });
  
  return `I think it's a ${label[0]}`;
  
}

async function handleIncomingSMS(body, callback) {
  // Get image public Twilio url
  const mediaUrl =decodeURIComponent(body[`MediaUrl${0}`]);
  
  // Compute label message
  const messageBody = await getLabel(mediaUrl);
  
  //Respond to webhook with label message
  callback(null, messageBody);
  
}


exports.handler = (event, context, callback) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);
  handleIncomingSMS(event, callback);
};