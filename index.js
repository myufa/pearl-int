const AWS = require('aws-sdk')
var awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
var bodyParser = require('body-parser')
var express = require('express')
const axios = require('axios');
const extName = require('ext-name');
const urlUtil = require('url');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const {Storage} = require('@google-cloud/storage');

const vision = require('@google-cloud/vision');


let twilioClient;
let images = [];

const config = JSON.parse(fs.readFileSync('gcp.json'));
console.log("gcp_cred", config);





async function getLabel(mediaUrl) {
  const storage = new Storage({ projectId: config.project_id, credentials: { client_email: config.client_email, private_key: config.private_key } });
  const bucket = storage.bucket('pearl-int');

  // Create a WritableStream from the File
  const file = bucket.file('temp.jpg');
  const writeStream = file.createWriteStream();

  
  const response = await axios.get(mediaUrl,  { responseType: 'arraybuffer' });
  const media = Buffer.from(response.data, "utf-8");

  
  const gcsUri = `gs://pearl-int/temp.jpg`;
  const googleClient = new vision.ImageAnnotatorClient({ projectId: config.project_id, credentials: { client_email: config.client_email, private_key: config.private_key } });
  const request = {
    image: {
      content: media
    }
  };
  const [result] = await googleClient.objectLocalization(request);
  const objects = result.localizedObjectAnnotations;
  const label = []
  console.log("objects", objects.length);
  if(objects.length === 0) return "No idea what this is"
  objects.forEach(object => {
    label.push(object.name)
    console.log(`Google Name: ${object.name}`);
    console.log(`Confidence: ${object.score}`);
  });
  
  return `I think it's a ${label[0]}`;
  
}

async function handleIncomingSMS(body, callback) {
  const { NumMedia, From: SenderNumber, MessageSid } = body;
  let saveOperations = [];
  let mediaItem;

  const mediaUrl =decodeURIComponent(body[`MediaUrl${0}`]);
  console.log("mediaUrl", mediaUrl);
  const mediaSid = path.basename(urlUtil.parse(mediaUrl).pathname);
  console.log("mediaSid", mediaSid);
  mediaItem = { mediaUrl, mediaSid, MessageSid };

  console.log("mediaItem", mediaItem);
  
  const messageBody = await getLabel(mediaUrl);
  
  callback(null, messageBody);
  
    
    //await deleteMediaItem(mediaItem).then(res=>console.log("delete_success", res));
}


exports.handler = (event, context, callback) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);
  handleIncomingSMS(event, callback);
}

// exports.handler =  async function(event, context) {
//   console.log("EVENT: \n" + JSON.stringify(event, null, 2));
//   return MessagingRouter;
// }