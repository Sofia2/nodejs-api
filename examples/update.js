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
			throw new Error('Error subscribing to SIB: ' + subscribeResponse.body);
		}

		// UPDATE message generation
		var ssapMessageUPDATE = ssapMessageGenerator.generateUpdateWithQueryTypeMessage(null, 'update TestSensorTemperatura set Sensor.measure=24 where Sensor.measure=25', 'TestSensorTemperatura', 'SQLLIKE', sessionKey);

		return myKp.send(ssapMessageUPDATE);	
	})
	.then(function(updateResponse) {
		var updateResponseBody = JSON.parse(updateResponse.body);
		
		if (updateResponseBody.ok) {
			console.log('Executed update for Ids: ' + updateResponseBody.data);
		} else {
			throw new Error('Error executing update: ' + updateResponse.body);
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
