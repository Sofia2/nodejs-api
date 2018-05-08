/*******************************************************************************
 * © Indra Sistemas, S.A.
 * 2013 - 2014  SPAIN
 * 
 * All rights reserved
 ******************************************************************************/
var mqtt   = require("mqtt");
var Q      = require('q');
var XXTEA  = require('./XXTEA');
var Base64 = require('./base64');

var CLIENT_TOPIC                      = "SSAP-REQUEST";           // Topic to publish messages
var TOPIC_PUBLISH_PREFIX              = '/TOPIC_MQTT_PUBLISH';    // Topic to receive the response
var TOPIC_SUBSCRIBE_INDICATION_PREFIX = '/TOPIC_MQTT_INDICATION'; // Topic to receive notifications


function nop() {}

/**
 * Constructor
 */ 
function KpMQTT() {
	this.notificationCallback = nop;
	this.client = null;
	this.subscriptionsPromises = [];
	this.cipherKey = null;
}


KpMQTT.prototype.createUUID = function () {
    // http://www.ietf.org/rfc/rfc4122.txt
    var s         = [];
    var hexDigits = "0123456789abcdef";
    
    for (var i = 0; i < 23; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8]  = s[13] = s[18] = "-";

    return s.join("");
};

/**
 * Connect to SIB and subscribe to topics
 */
KpMQTT.prototype.connect = function(host, port, keepalive) {
	keepalive = keepalive || 5;

	var clientId = this.createUUID();

    var opts = {
        clientId  : clientId,
        keepalive : keepalive 
    };
	
	this.client = mqtt.createClient(port, host, opts);
	
	var self = this;
	this.client.on('message', function(topic, message) {
		if (this.cipherKey) {
			message = XXTEA.decrypt(Base64.decode(message), this.cipherKey);
		}
		
		if (topic == TOPIC_PUBLISH_PREFIX + clientId) {
            var deferred = self.subscriptionsPromises.shift();
			
			try {
				deferred.resolve(JSON.parse(message));
			} catch (e) {
				deferred.reject(e);
			}
            
		} else if (topic == TOPIC_SUBSCRIBE_INDICATION_PREFIX + clientId) {
            self.notificationCallback(JSON.parse(message));
		}
	});
	
	return Q.all([
		Q.ninvoke(this.client, "subscribe", TOPIC_PUBLISH_PREFIX + clientId),
		Q.ninvoke(this.client, "subscribe", TOPIC_SUBSCRIBE_INDICATION_PREFIX + clientId)
	]).timeout(keepalive * 1000);
};

KpMQTT.prototype.disconnect = function() {
	this.client.end();
};


KpMQTT.prototype.isConnected = function() {
	return this.client.connected;
};

KpMQTT.prototype.send = function(ssapMessage) {
	if (this.cipherKey) {
		var index = ssapMessage.indexOf('instance');
		if (index != -1) {
			var init    = index + 'instance'.length;
			var end     = ssapMessage.length;		
			var kpName  = ssapMessage.substring(init, end).split(':')[1];
			
			kpName      = kpName.replace('\\"', '').trim();
			ssapMessage = kpName.length + "#" + kpName + Base64.encode(XXTEA.encrypt(ssapMessage, this.cipherKey), false);
		} else {
			ssapMessage = Base64.encode(XXTEA.encrypt(ssapMessage, this.cipherKey), false);
		}
	}

	var deferred = Q.defer();
	
	var self = this;
	this.client.publish(CLIENT_TOPIC, ssapMessage, {qos: 1, retain: false}, function() {
		self.subscriptionsPromises.push(deferred);
	});

	return deferred.promise;
};

KpMQTT.prototype.setNotificationCallback = function(notificationCallback) {
	if (typeof notificationCallback !== 'function') {
		throw new Error("notificationCallback must be a function");
	}
	
	this.notificationCallback = notificationCallback;
};

KpMQTT.prototype.setCipherKey = function(cipherKey) {
	this.cipherKey = cipherKey;
};


exports.KpMQTT = KpMQTT;
