'use strict';
var noble = require('./index');
var mqtt = require('mqtt')



console.log('noble');

noble.on('stateChange', function(state) {
	console.log('on -> stateChange: ' + state);

	if (state === 'poweredOn') {
		noble.startScanning();
	} else {
		noble.stopScanning();
	}
});

noble.on('scanStart', function() {
	console.log('on -> scanStart');
});

noble.on('scanStop', function() {
	console.log('on -> scanStop');
});



noble.on('discover', function(peripheral) {
	if(peripheral.id=='244b03e895af'){
		console.log('year it worked!');
	}
	console.log('on -> discover: ' + peripheral);

	noble.stopScanning();

	peripheral.on('connect', function() {
		console.log('on -> connect');
		this.updateRssi();
	});

	peripheral.on('disconnect', function() {
		console.log('on -> disconnect');
	});

	peripheral.on('rssiUpdate', function(rssi) {
		console.log('on -> RSSI update ' + rssi);
		this.discoverServices();
	});

	peripheral.on('servicesDiscover', function(services) {
		console.log('on -> peripheral services discovered ' + services);

		var serviceIndex = 0;

		services[serviceIndex].on('includedServicesDiscover', function(includedServiceUuids) {
			console.log('on -> service included services discovered ' + includedServiceUuids);
			this.discoverCharacteristics();
		});

		services[serviceIndex].on('characteristicsDiscover', function(characteristics) {
			console.log('on -> service characteristics discovered ' + characteristics);

			var characteristicIndex = 0;

			characteristics[characteristicIndex].on('read', function(data, isNotification) {
				console.log('on -> characteristic read ' + data + ' ' + isNotification);
				console.log(data);

				peripheral.disconnect();
			});

			characteristics[characteristicIndex].on('write', function() {
				console.log('on -> characteristic write ');

				peripheral.disconnect();
			});

			characteristics[characteristicIndex].on('broadcast', function(state) {
				console.log('on -> characteristic broadcast ' + state);

				peripheral.disconnect();
			});

			characteristics[characteristicIndex].on('notify', function(state) {
				console.log('on -> characteristic notify ' + state);

				peripheral.disconnect();
			});

			characteristics[characteristicIndex].on('descriptorsDiscover', function(descriptors) {
				console.log('on -> descriptors discover ' + descriptors);

				var descriptorIndex = 0;

				descriptors[descriptorIndex].on('valueRead', function(data) {
					console.log('on -> descriptor value read ' + data);
					console.log(data);
					peripheral.disconnect();
				});

				descriptors[descriptorIndex].on('valueWrite', function() {
					console.log('on -> descriptor value write ');
					peripheral.disconnect();
				});

				descriptors[descriptorIndex].readValue();
			});


			characteristics[characteristicIndex].read();
		});


		services[serviceIndex].discoverIncludedServices();
	});

	peripheral.connect();
});

	const state = {
		'aim': false,
		'busy': false,
		'sequence': 0,
	};

	let controlCharacteristic;
	let coreHeading;
	let gattServer;
	let robotService;
	let radioService;

	const setHeading = function(heading) {
		if (state.busy) {
			// Return if another operation pending
			return Promise.resolve();
		}
		state.busy = true;
		const did = 0x02;
		const cid = 0x01;
		const data = new Uint16Array([heading]);

		sendCommand(did, cid, data).then(() => {
			state.busy = false;
	})
	.catch(exception => {
			console.log(exception);
	});
	};

	// Code based on https://github.com/WebBluetoothCG/demos/blob/gh-pages/bluetooth-toy-bb8/index.html
	const roll = function(heading, speed, rollState) {
		console.log('Roll heading=' + heading + ', speed=' + speed);
		if (state.busy) {
			// Return if another operation pending
			return Promise.resolve();
		}
		coreHeading = heading;
		state.busy = true;
		const did = 0x02; // Virtual device ID
		const cid = 0x30; // Roll command
		// Roll command data: speed, heading (MSB), heading (LSB), state
		const data = new Uint8Array([speed, heading >> 8, heading & 0xFF, rollState]);
		sendCommand(did, cid, data).then(() => {
			state.busy = false;
	})
	.catch(exception => {
			console.log(exception);
	});
	};

	//MOVE IN A SQUARE AND STOP

	const square = function() {
		roll(Math.round(180), 30, 1);
		setTimeout(function() {
			roll(Math.round(90), 30, 1);
		}, 2000);
		setTimeout(function() {
			roll(Math.round(0), 30, 1);
		}, 4000);
		setTimeout(function() {
			roll(Math.round(270), 30, 1);
		}, 6000);
		setTimeout(function() {
			stopRolling();
			console.log('stopRolling');
		}, 8000);
	}

	//DISCO MODE

	const disco = function(heading, speed, rollState) {
		var audio = new Audio('test.mp3');
		audio.play();
		setTimeout(function() {
			setColor(255, 0, 0);
		}, 0);
		setTimeout(function() {
			roll(Math.round(180), 60, 1);
		}, 500);
		setTimeout(function() {
			setColor(0, 255, 0);
		}, 1000);
		setTimeout(function() {
			roll(Math.round(0), 60, 1);
		}, 1500);
		setTimeout(function() {
			setColor(0, 0, 255);
		}, 2000);
		setTimeout(function() {
			roll(Math.round(180), 60, 1);
		}, 2500);
		setTimeout(function() {
			setColor(0, 0, 0);
		}, 3000);
		setTimeout(function() {
			roll(Math.round(0), 60, 1);
		}, 3500);
		setTimeout(function() {
			stopRolling();
			console.log('stopRolling');
		}, 4000);
	}

	//STOP ROLLING

	const stopRolling = function() {
		if (state.busy) {
			setTimeout(stopRolling, 100);
			// Return if another operation pending
			return Promise.resolve();
		}
		state.busy = true;
		const did = 0x02; // Virtual device ID
		const cid = 0x30; // Roll command
		// Roll command data: speed, heading (MSB), heading (LSB), state
		const data = new Uint8Array([
			100, coreHeading >> 8, coreHeading & 0xFF, 0
		]);
		sendCommand(did, cid, data).then(() => {
			state.busy = false;
	})
	.catch(exception => {
			console.log(exception);
	});
	};

	const setBackLed = function(brightness) {
		console.log('Set back led to ' + brightness);
		const did = 0x02; // Virtual device ID
		const cid = 0x21; // Set RGB LED Output command
		// Color command data: red, green, blue, flag
		const data = new Uint8Array([brightness]);
		return sendCommand(did, cid, data);
	};

	// Code based on https://github.com/WebBluetoothCG/demos/blob/gh-pages/bluetooth-toy-bb8/index.html
	const setColor = function(r, g, b) {
		console.log('Set color: r='+r+',g='+g+',b='+b);
		if (state.busy) {
			// Return if another operation pending
			return Promise.resolve();
		}
		state.busy = true;
		const did = 0x02; // Virtual device ID
		const cid = 0x20; // Set RGB LED Output command
		// Color command data: red, green, blue, flag
		const data = new Uint8Array([r, g, b, 0]);
		sendCommand(did, cid, data).then(() => {
			state.busy = false;
	})
	.catch(exception => {
			console.log(exception);
	});
	};

	// Code based on https://github.com/WebBluetoothCG/demos/blob/gh-pages/bluetooth-toy-bb8/index.html
	const sendCommand = function(did, cid, data) {
		// Create client command packets
		// API docs: https://github.com/orbotix/DeveloperResources/blob/master/docs/Sphero_API_1.50.pdf
		// Next sequence number
		const seq = state.sequence & 0xFF;
		state.sequence += 1;
		// Start of packet #2
		let sop2 = 0xFC;
		sop2 |= 1; // Answer
		sop2 |= 2; // Reset timeout
		// Data length
		const dlen = data.byteLength + 1;
		const sum = data.reduce((a, b) => {
			return a + b;
	});
		// Checksum
		const chk = ((sum + did + cid + seq + dlen) & 0xFF) ^ 0xFF;
		const checksum = new Uint8Array([chk]);
		const packets = new Uint8Array([0xFF, sop2, did, cid, seq, dlen]);
		// Append arrays: packet + data + checksum
		const array = new Uint8Array(packets.byteLength + data.byteLength + checksum.byteLength);
		array.set(packets, 0);
		array.set(data, packets.byteLength);
		array.set(checksum, packets.byteLength + data.byteLength);
		console.log('Sending', array);
		return descriptor.writeValue(array).then(() => {
			//hier wird der blue command geschickt
			console.log('Command write done.');
	});
	};

	// CODE BASED ON https://github.com/WebBluetoothCG/demos/blob/gh-pages/bluetooth-toy-bb8/index.html
	// CONNECT VIA BLUTOOTH
/*
	function connect() {

			console.log('Web Bluetooth API is not available.\n' +
				'Please make sure the Web Bluetooth flag is enabled.');



		console.log('Requesting RollB…');

		const serviceA = '22bb746f-2bb0-7554-2d6f-726568705327';
		const serviceB = '22bb746f-2ba0-7554-2d6f-726568705327';
		const controlCharacteristicId = '22bb746f-2ba1-7554-2d6f-726568705327';
		const antiDosCharacteristicId = '22bb746f-2bbd-7554-2d6f-726568705327';
		const txPowerCharacteristicId = '22bb746f-2bb2-7554-2d6f-726568705327';
		const wakeCpuCharacteristicId = '22bb746f-2bbf-7554-2d6f-726568705327';
		bl
		navigator.bluetooth.requestDevice({
			'filters': [{ 'namePrefix': ['BB'] }],
			'optionalServices': [
				serviceA,
				serviceB
			]
		})
			.then(device => {
			console.log('Got device: ' + device.name);
		return device.gatt.connect();
	})
	.then(server => {
			console.log('Got server');
		gattServer = server;
		return gattServer.getPrimaryService(serviceA);
	})
	.then(service => {
			console.log('Got service');
		// Developer mode sequence is sent to the radio service
		radioService = service;
		// Get Anti DOS characteristic
		return radioService.getCharacteristic(antiDosCharacteristicId);
	})
	.then(characteristic => {
			console.log('> Found Anti DOS characteristic');
		// Send special string
		let bytes = new Uint8Array('011i3'.split('').map(c => c.charCodeAt()));
		return characteristic.writeValue(bytes).then(() => {
			console.log('Anti DOS write done.');
	})
	})
	.then(() => {
			// Get TX Power characteristic
			return radioService.getCharacteristic(txPowerCharacteristicId);
	})
	.then(characteristic => {
			console.log('> Found TX Power characteristic');
		const array = new Uint8Array([0x07]);
		return characteristic.writeValue(array).then(() => {
			console.log('TX Power write done.');
	})
	})
	.then(() => {
			// Get Wake CPU characteristic
			return radioService.getCharacteristic(wakeCpuCharacteristicId);
	})
	.then(characteristic => {
			console.log('> Found Wake CPU characteristic');
		const array = new Uint8Array([0x01]);
		return characteristic.writeValue(array).then(() => {
			console.log('Wake CPU write done.');
	})
	})
	.then(() => {
			// Get robot service
			return gattServer.getPrimaryService(serviceB)
		})
	.then(service => {
			// Commands are sent to the robot service
			robotService = service;
		// Get Control characteristic
		return robotService.getCharacteristic(controlCharacteristicId);
	})
	.then(characteristic => {
			console.log('> Found Control characteristic');
		// Cache the characteristic
		controlCharacteristic = characteristic;
		return setColor(0, 250, 0);
	})
	.catch(exception => {
			console.log(exception);
	});
	};

	*/


