/*******************************************************************************
 * © Indra Sistemas, S.A.
 * 2013 - 2014  SPAIN
 * 
 * All rights reserved
 ******************************************************************************/
var kp = require('../kpMQTT');
var ssapMessageGenerator = require("../SSAPMessageGenerator");

var myKp = new kp.KpMQTT();
var sessionKey;

//Connect to SIB
myKp.connect('sofia2.com', 1883)
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
