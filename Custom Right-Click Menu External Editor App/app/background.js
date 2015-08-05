var files;
chrome.storage.local.get(function(items) {
	files = items.files || {};
});
var currentlyEditing = [];
var connections = {};
var idNum = 0; //Id to keep track of all the connections, each connection gets their own ID

/*
 * Handles the job of connecting to the extension
 * 
 * @param {object} connection The connection on which the message was sent
 * @param {object} msg The message sent by the extension
 */
function connectionHandler(connection, msg) {
	console.log(msg);
	console.log(connection);
	switch (msg.stage) {
		case 0:
			if (msg.message === 'hi') { //The extension sent its first message, send something back to show that we're here
				connection.port.postMessage({
					status: 'connecting',
					stage: 1,
					message: 'hey'
				});
				//Update connection values
				connection.connection.status = 'connecting';
				connection.connection.stage = 1;
			}
			break;
		case 2:
			if (msg.message === 'hello') { //Extension confirms it heard the app, connection is solid
				connection.connection.status = 'connected';
				connection.connection.connected = true;
				connection.connection.stage = 3;
				console.log('connected');
				console.log(connection);
			}
			break;
	}
}

/*
 * Deletes any connections that did not respond to the ping
 */
function deleteDisconnected() {
	for (connection in connections) {
		if (connections.hasOwnProperty(connection)) {
			if (connection.pinging) {
				delete connections[connection.id];
			}
		}
	}
}

/*
 * Pings any current connections and sees if they are still live
 */
function ping() {
	for (connection in connections) {
		if (connections.hasOwnProperty(connection)) {
			if (connection.connected) {
				connection.postMessage({
					status: 'ping',
					message: 'hello?'
				});
				connection.pinging = true;
			}
		}
	}
}

/**
 * Gets the code for given item
 * 
 * @param {object} item The item to check for
 * @returns {string} The item's current code
 */
function getCode(item) {
	//TODO this
}

/*
 * Updates the file's new name to the file in the user's filesystem
 * 
 * @param {object} file The file for which to update the name
 * @param {string} newName The new name for the file
 */
function updateFileName(file, newName) {
	//TODO other stuff
	file.name = newName;
}

chrome.notifications.onButtonClicked(function() {
	for (connection in connections) {
		if (connections.hasOwnProperty(connection)) {
			connection.port.postMessage({
				status: 'connected',
				action: 'hideNotifications'
			});
		}
	}
});

/**
 * Shows a notification that file with name "name" is now editable
 * @param {string} name The name of the file
 */
function showConnectedNotification(name) {
	//TODO show where it is editable
	chrome.notifications.create({
		type: 'basic',
		title: 'File ' + name + ' now editable',
		message: 'The file ' + name + '.js is now editable, click to open its location',
		iconUrl: 'editImg.svg',
		buttons: {
			title: 'Stop showing these notifications'
		}
	});
}

/*
 * Pushes the code to a file's contents
 * 
 * @param {object} file The file for which to push the code
 * @param {string} code The code to push
 */
function pushFileCode(file, code) {
	//TODO this
	//Set a file's code
}

/**
 * Sets up the code for the file, letting the user choose which to keep
 * 
 * @param {object} file The file for which to update the code
 * @param {string} newCode The code to insert
 */
function setupFileCode(file, newCode) {
	var fileCode = getCode(item);
	if (fileCode !== newCode) {
		//Let the user choose whether to keep the local copy or the extension's copy
		function tempListener(msg) {
			if (msg.status === 'connected' && msg.action === ' chooseScript') {
				if (msg.choice === 'local') {
					pushFileCode(file, newCode);
				} else {
					pushFileCode(file, fileCode);
				}
				showConnectedNotification(file.name);
			}
		}
		file.connection.port.onMessage.addListener(tempListener);
		file.connection.port.postMessage({
			status: 'connected',
			action: 'chooseScript',
			local: newCode,
			external: fileCode
		});
	}
}

/**
 * Initialises the script with its connection and external file
 * 
 * @param {object} connection The connection on which the message was sent
 * @param {object} msg The message sent by the extension
 */
function setupScript(connection, msg) {
	var file = files[msg.id];
	if (file) {
		//File already exists, check if the names still match 
		if (file.name !== msg.name) {
			updateFileName(file, msg.name);
			file.connection = connection;
			connection.file = file;
			setupFileCode(file, msg.code);
		}
	} else {
		file = {
			name: msg.name,
			id: msg.id,
			code: ''
		};
		//TODO Create the file

		file.connection = connection;
		connection.file = file;
	}

	currentlyEditing.push(file);
}

/**
 * Handles any messages related to the external editing of a script
 * 
 * @param {object} connection The connection on which the message was sent
 * @param {object} msg The message sent by the extension
 */
function externalEditingMessageHandler(connection, msg) {
	switch (msg.action) {
	case 'setupScript':
		setupScript(connection, msg);
		break;
	}
}

/*
 * Every minute a ping is sent out to all connections to check if they are still there, if they don't respond in one minute they are removed
 */
function checkAliveConnections() {
	deleteDisconnected();
	ping();
}

/*
 * Updates the code for given item
 * 
 * @param {object} item The item for which to update the code
 */
function updateCode(item) {
	var newCode = getCode(item);
	if (newCode !== item.code) {
		item.connection.port.postMessage({
			status: 'connected',
			action: 'updateFromApp',
			code: newCode
		});
	}
}

/*
 * Every minute push all code from open files back to the extensions
 */
function updateCodeForAll() {
	currentlyEditing.forEach(function(item) {
		updateCode(item);
	});
}

window.setInterval(function() {
	checkAliveConnections();
	updateCodeForAll();
}, 3600000);

/**
 * Handles the message sent by the extension
 * 
 * @param {object} connection The connection on which the message was sent
 * @param {object} msg The message sent by the extension
 */
function handleMessage(connection, msg) {
	switch (msg.status) {
		case 'connecting':
			connectionHandler(connection, msg);
			break;
		case 'connected':
			externalEditingMessageHandler(connection, msg);
			break;
		case 'ping':
			connection.pinging = false;
			break;
	}
}

/**
 * Creates a handler for the parsing of a message
 * 
 * @param {Object} connection The connection to add
 * @returns {Function} A function that handles a message being passed to it
 */
function createMessageHandler(connection) {
	return function (msg) {
		console.log(msg);
		console.log(connection);
		handleMessage(connection, msg);
	}
}

/**
 * Creates a handler for the deletion of a connection from the list
 * 
 * @param {Number} id The id given to the connection
 * @returns {Function} A function that deletes the item
 */
function createDeletionHandler(id) {
	return function() {
		delete connections[id];
	}
}

var connectionObject;
chrome.runtime.onConnectExternal.addListener(function(port) {
	if (port.sender.id === 'obnfehdnkjmbijebdllfcnccllcfceli') {
		var connectionObject = {
			connection: {
				status: 'not connected',
				connected: false
			},
			port: port,
			id: ++idNum
		};
		connections[idNum] = connectionObject;
		var handler = createMessageHandler(connectionObject);
		console.log(handler);
		port.onMessage.addListener(handler);
		port.onDisconnect.addListener(createDeletionHandler(idNum));
	}
});