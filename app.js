'use strict';

const apiai = require('apiai');
const config = require('./config');
const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const request = require('request');
const sfcc = require('./qsr-apis');
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
				 	var resData= receivedMessage(data);
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
		return sendToApiAi(sessionId, data);
	} else {
		console.log("No user Input");
	}
}


function handleApiAiAction(senderId, action, responseText, responseSpeech, contexts, parameters) {
	switch (action) {

		// case 'action':
		// 								return sendTextMessage(senderId, responseText);
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

	if (responseSpeech == '' && responseText == '' && !isDefined(action)) {
		//api ai could not evaluate input.
		console.log('Unknown query' + response.result.resolvedQuery);
		sendTextMessage(senderId, "I'm not sure what you want. Can you be more specific?");
	} else if (isDefined(action)) {
		return handleApiAiAction(senderId, action, responseText, responseSpeech, contexts, parameters);
	}
}

function sendToApiAi(sessionId, data) {

	let apiaiRequest = apiAiService.textRequest(text, {
		sessionId: sessionId
	});

	apiaiRequest.on('response', (response) => {
		if (isDefined(response.result)) {
			console.log(response.result);
			return handleApiAiResponse(sessionId, response);
		}
	});

	apiaiRequest.on('error', (error) => console.error(error));
	apiaiRequest.end();
}




function sendTextMessage(senderId, text) {
	var messageData = {
		fulfillment: {
			speech: text,
			displayText: text
		}
	}

	return messageData;
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
