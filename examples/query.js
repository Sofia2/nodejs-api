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

		// QUERY message generation
		var ssapMessageQUERY = ssapMessageGenerator.generateQueryWithQueryTypeMessage('select * from TestSensorTemperatura where Sensor.measure=25 limit 1', 'TestSensorTemperatura', 'SQLLIKE', null, sessionKey);

		return myKp.send(ssapMessageQUERY);
	})
	.then(function(queryResponse) {
		var queryResponseBody = JSON.parse(queryResponse.body);
		
		if (queryResponseBody.ok) {
			console.log('Query return: ' + queryResponseBody.data);
		} else {
			throw new Error('Error executing query in the SIB: ' + queryResponse.body);
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
