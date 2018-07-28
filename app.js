'use strict';

const apiai = require('apiai');
const config = require('./config');
const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const request = require('request');
const app1 = require('./app1');
const app = express();
const uuid = require('uuid');


if (!config.API_AI_CLIENT_ACCESS_TOKEN) {
	throw new Error('missing API_AI_CLIENT_ACCESS_TOKEN');
}
if (!config.SERVER_URL) { //used for ink to static files
	throw new Error('missing SERVER_URL');
}



app.set('port', (process.env.PORT || 5000))

//serve static files in the public directory
app.use(express.static('public'));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
	extended: false
}))

// Process application/json
app.use(bodyParser.json())




const apiAiService = apiai(config.API_AI_CLIENT_ACCESS_TOKEN, {
	language: "en",
});
const sessionIds = new Map();

// Index route
app.get('/', function (req, res) {
	res.send('Hello world, I am a chat bot')
})

app.post('/webhook/', function (req, res) {
	var data = req.body;
	console.log(JSON.stringify(data));

				if (data.status.code == 200) {
					console.log('In /webhook/ function');
				 	var resData= receivedMessage(data);
					console.log(resData);
				}else {
					console.log("Webhook received unknown message ");
				}

		// Assume all went well.
		// You must send back a 200, within 20 seconds
		res.sendStatus(200);
		res.send(resData);
});


function receivedMessage(data) {

	var actionName = data.result.action;
	var parameters = data.result.parameters;
	var message = data.result.resolvedQuery;
	var sessionId = data.sessionId;
	if (message) {
		//send message to api.ai
		console.log('In received message event');
		return sendToApiAi(sessionId, data);
	} else {
		console.log("No user Input");
	}
}


function handleApiAiAction(senderId, action, responseText, responseSpeech, contexts, parameters) {
	console.log('In handleAPIAiaction');
	switch (action) {

		case 'pincode.request': {
					console.log('In action pincode');
					var displayText = '';
					if(isDefined(action) && parameters !== ''){

						var pincode = parameters.any;
						app1.requestCoordinate(pincode,(error, results) => {
							if(error){
								displayText = 'Error fetching the data';
							}else {
								displayText = `Latitude: ${results.latitude}  Longitude: ${results.longitude}`;
								// var displayText = {
								// displayText :`Latitude: ${results.latitude}  Longitude: ${results.longitude}`,
								// speech : `Latitude: ${results.latitude}  Longitude: ${results.longitude}`
								// }

							}
							console.log(displayText);
							
						});
					var d=sendTextMessage(senderId, displayText));
						console.log(d);
					}
					break;
				}

		default:
			//unhandled action, just send back the text
			sendTextMessage(senderId, responseText);
	}
}


function handleApiAiResponse(senderId, response) {
	let responseSpeech = response.result.fulfillment.speech;
	let responseText = response.result.fulfillment.displayText;
	let messages = response.result.fulfillment.messages;
	let action = response.result.action;
	let contexts = response.result.contexts;
	let parameters = response.result.parameters;
	
	console.log('In handleAPIAiResponse');
	if (responseSpeech == '' && responseText == '' && !isDefined(action)) {
		//api ai could not evaluate input.
		console.log('Unknown query' + response.result.resolvedQuery);
		sendTextMessage(senderId, "I'm not sure what you want. Can you be more specific?");
	} else if (isDefined(action)) {
		return handleApiAiAction(senderId, action, responseText, responseSpeech, contexts, parameters);
	}
}

function sendToApiAi(sessionId, data) {

	console.log("In send to APIAI");
// 	let apiaiRequest = apiAiService.textRequest(data, {
// 		sessionId: sessionId
// 	});

// 	apiaiRequest.on('response', (response) => {
		if (isDefined(data)) {
			console.log(data);
			return handleApiAiResponse(sessionId, data);
		//}
	}

// 	apiaiRequest.on('error', (error) => console.error(error));
// 	apiaiRequest.end();
}




function sendTextMessage(senderId, text) {
	
	console.log('In sendTextMessage');
	var messageData = {

			speech: text,
			displayText: text

	}
	
	app.post('/webhook/', function (req, res) {
	var data = req.body;
	console.log(JSON.stringify(data));

		res.sendStatus(200);
		res.send(messageData);
});
	console.log(messageData);
}

function isDefined(obj) {
	if (typeof obj == 'undefined') {
		return false;
	}

	if (!obj) {
		return false;
	}

	return obj != null;
}

// Spin up the server
app.listen(app.get('port'), function () {
	console.log('running on port', app.get('port'))
})
