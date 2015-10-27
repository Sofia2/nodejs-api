/*******************************************************************************
 * © Indra Sistemas, S.A.
 * 2013 - 2014  SPAIN
 * 
 * All rights reserved
 ******************************************************************************/
var kp = require('../kpMQTT');
var ssapMessageGenerator = require("../SSAPMessageGenerator");
var Promise = require('q').Promise;

var myKp = new kp.KpMQTT();

var notificationPromise = new Promise(function(resolve, reject) {
	var onNotification = function(message) {
		console.log("Notification received");
		resolve(message);
	};
	
	myKp.setNotificationCallback(onNotification);
});

var sessionKey;
var subsId;

//Connect to SIB
myKp.connect('sofia2.com', 1880)
	.then(function() {
		// JOIN Message generation
		var ssapMessageJOIN = ssapMessageGenerator.generateJoinByTokenMessage('e5e8a005d0a248f1ad2cd60a821e6838', 'KPTestTemperatura:KPTestTemperatura01');
		
		return myKp.send(ssapMessageJOIN);
	})
	.then(function(joinResponse) {
		var joinResponseBody = JSON.parse(joinResponse.body);
		
		if (joinResponseBody.ok) {
			sessionKey = joinResponse.sessionKey;
			console.log('Session created with SIB with sessionKey: ' + sessionKey);
		} else {
			throw new Error('Error creating session with SIB: ' + joinResponse.body);
		}

		// SUBSCRIBE message generation
		var ssapMessageSUBSCRIBE = ssapMessageGenerator.generateSubscribeWithQueryTypeMessage('Select * from TestSensorTemperatura where Sensor.measure=25', 'TestSensorTemperatura', 'SQLLIKE', 0, sessionKey);
		
		return myKp.send(ssapMessageSUBSCRIBE);
	})
	.then(function(subscribeResponse) {
		var subscribeResponseBody = JSON.parse(subscribeResponse.body)
		
		if (subscribeResponseBody.ok) {
			subsId = subscribeResponseBody.data;
			console.log('Subscribed to SIB with SubscriptionId: ' + subsId);
		} else {
			throw new Error('Error subscribing to SIB: ' + subscribeResponse.body);
		}
		
		// INSERT message generation
		var ontologyInstance = "{ \\\"Sensor\\\": { \\\"geometry\\\": { \\\"coordinates\\\": [ 40.512967, -3.67495 ], \\\"type\\\": \\\"Point\\\" }, \\\"assetId\\\": \\\"S_Temperatura_00066\\\", \\\"measure\\\": 25, \\\"timestamp\\\": { \\\"$date\\\": \\\"2014-04-29T08:24:54.005Z\\\" }  } }";
		var ssapMessageINSERT = ssapMessageGenerator.generateInsertMessage(ontologyInstance, 'TestSensorTemperatura', sessionKey);
		
		return myKp.send(ssapMessageINSERT);
	})
	.then(function(insertResponse) {
		var insertResponseBody = JSON.parse(insertResponse.body);
		
		if (insertResponseBody.ok) {
			console.log('Ontology Instance inserted in the SIB with ObjectId: ' + insertResponseBody.data);
		} else {
			throw new Error('Error inserting Ontology Instance in the SIB: ' + insertResponse.body);
		}
		
		return notificationPromise;
	})
	.then(function(notificationMessage) {
		var notificationMessageBody = JSON.parse(notificationMessage.body);
		
		if (notificationMessageBody.ok) {
			console.log('Received notification message with data: ' + notificationMessageBody.data);
		} else {
			throw new Error('Error in notification message: ' + notificationMessage.body);
		}
		
		// UNSUBSCRIBE message generation
		var ssapMessageUNSUBSCRIBE = ssapMessageGenerator.generateUnsubscribeMessage(subsId, 'TestSensorTemperatura', sessionKey);
		
		return myKp.send(ssapMessageUNSUBSCRIBE);
	})
	.then(function(unsubscribeResponse) {
		var unsubscribeResponseBody = JSON.parse(unsubscribeResponse.body);
		
		if (unsubscribeResponseBody.ok) {
			console.log('Unsubscribed from SIB');
		} else {
			console.log('Error unsubscribing from SIB:' + unsubscribeResponse.body);
		}

		// LEAVE Message generation
		var ssapMessageLEAVE = ssapMessageGenerator.generateLeaveMessage(sessionKey);

		return myKp.send(ssapMessageLEAVE);
	})
	.then(function(leaveResponse) {
		var leaveResponseBody = JSON.parse(leaveResponse.body);
		
		if (leaveResponseBody.ok) {
			console.log('Session closed with SIB');
		} else {
			console.log('Error closing session with SIB: ' + leaveResponse.body);
		}
	})
	.done(function() {
		//Disconnect from SIB
		myKp.disconnect();
	});
