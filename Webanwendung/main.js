(function() {

	'use strict';

	if (
		location.hostname.endsWith('.github.io') &&
		location.protocol != 'https:'
	) {
		location.protocol = 'https:';
	}




	const elConnect = document.querySelector('#connect');
	const elAim = document.querySelector('#aim');
	const elRed = document.querySelector('#red');
	const elBlue = document.querySelector('#blue');
	const elGreen = document.querySelector('#green');
	const elOff = document.querySelector('#off');
	//const elJoypad = document.querySelector('#joypad');
	const moveFront = document.querySelector('#front');
	const moveBack = document.querySelector('#back');
	const moveLeft = document.querySelector('#left');
	const moveRight = document.querySelector('#right');
	const moveSquare = document.querySelector('#square');
	const makeSound = document.querySelector('#sound');
	const discoMode = document.querySelector('#disco');



	if (navigator.vibrate) {
		[
			elConnect, elAim, elRed, elBlue,
			elGreen, elOff, moveFront, moveBack
		].forEach(function(element) {
			element.addEventListener('touchstart', function(event) {
				navigator.vibrate(15);
			});
		});
	}

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

	const square = function(heading, speed, rollState) {
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
		return controlCharacteristic.writeValue(array).then(() => {
			console.log('Command write done.');
	});
	};

	// CODE BASED ON https://github.com/WebBluetoothCG/demos/blob/gh-pages/bluetooth-toy-bb8/index.html
	// CONNECT VIA BLUTOOTH

	function connect() {
		if (!navigator.bluetooth) {
			console.log('Web Bluetooth API is not available.\n' +
				'Please make sure the Web Bluetooth flag is enabled.');
			return;
		}

		console.log('Requesting RollB…');

		const serviceA = '22bb746f-2bb0-7554-2d6f-726568705327';
		const serviceB = '22bb746f-2ba0-7554-2d6f-726568705327';
		const controlCharacteristicId = '22bb746f-2ba1-7554-2d6f-726568705327';
		const antiDosCharacteristicId = '22bb746f-2bbd-7554-2d6f-726568705327';
		const txPowerCharacteristicId = '22bb746f-2bb2-7554-2d6f-726568705327';
		const wakeCpuCharacteristicId = '22bb746f-2bbf-7554-2d6f-726568705327';
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

	elConnect.onclick = function() {
		connect();
	};

	elAim.onclick = function() {
		state.aim = !state.aim;
		if (state.aim) {
			setBackLed(0xff).then(() => setColor(0, 0, 0));

		} else {
			setBackLed(0).then(() => setHeading(0));
		}
		elAim.classList.toggle('active');
	};

// BUTTONS AND FUNCTIONS

	moveBack.onclick = function() {
		roll(Math.round(0), 30, 1);
	};

	moveFront.onclick = function() {
		roll(Math.round(180), 30, 1);
	};

	moveLeft.onclick = function() {
		roll(Math.round(90), 30, 1);
	};

	moveRight.onclick = function() {
		roll(Math.round(270), 30, 1);
	};

	elRed.onclick = function() {
		setColor(255, 0, 0);
	};

	elGreen.onclick = function() {
		setColor(0, 255, 0);
	};

	elBlue.onclick = function() {
		setColor(0, 0, 255);
	};

	elOff.onclick = function() {
		stopRolling();
	};

	moveSquare.onclick = function() {
		square();
	}

	makeSound.onclick = function() {
		var audio = new Audio('test.mp3');
		audio.play();
	}


	discoMode.onclick = function() {
		disco();
	}

}());
