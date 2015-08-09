///<reference path="../../references/_references.js"/>
var files;
chrome.storage.local.get(function(items) {
	files = items.files || {};
});
var currentlyEditing = [];
var connections = {};
var idNum = 0; //Id to keep track of all the connections, each connection gets their own ID

/*
 * CurrentlyEditing contains all the "file"s currently being edited
 * 
 * Each new connections get put in connections with its ID being idNum, having the properties:
 *		"connecting", containing data about the connection's status (connected, connecting, not connected)
 *		"id", containg the key to the item from the connections object, this being idNum
 *		"port", the port on which data can be posted directly to the connection
 *		"file", containing an object which is also part of the "files" object, this contains the following properties: 
 *			"code", the code inside the file,
 *			"connection", a reference to the connection object itself,
 *			"id", the id for the file itself, the id can request the file using chrome.fileSystem.restoreEntry(id),
 * 
 * Any "file" will be saved in chrome.storage.local, whenever a connection asks for a specific file's ID, the connection gets linked to that file
 * 
 */

function removeFromArray(array, toRemove) {
	var len = array.length;
	for (var i = 0; i < len; i++) {
		if (array[i] === toRemove) {
			array.splice(i, 1);
			break;
		}
	}
}

function chooseFileLocation(name, content, callback) {
	chrome.app.window.create('../html/chooseFile.html', {
		bounds: {
			width: 550,
			height: 195,
			left: 100,
			top: 500
		},
		id: 'chooseFileWindow',
		minWidth: 550,
		minHeight: 195,
		maxWidth: 550,
		maxHeight: 195,
		resizable: false,
		frame: {
			type: 'chrome',
			color: '#FFFFFF'
		}
	}, function(createdWindow) {
		createdWindow.contentWindow.name = name;
		createdWindow.contentWindow.content = content;
		createdWindow.contentWindow.onFinish = callback;
	});
}

/*
 * Handles the job of connecting to the extension
 * 
 * @param {object} connection The connection on which the message was sent
 * @param {object} msg The message sent by the extension
 */
function connectionHandler(connection, msg) {
	switch (msg.stage) {
		case 0:
			if (msg.message === 'hi') { //The extension sent its first message, send something back to show that we're here
				connection.port.postMessage({
					status: 'connecting',
					stage: 1,
					message: 'hey',
					connectionId: connection.id
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
				if (connections.file.currentlyEditing) {
					removeFromArray(currentlyEditing, connections.file);
					connections.file.currentlyEditing = false;
					delete connections[connection.id];
				}
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
					message: 'hello?',
					connectionId: connection.id
				});
				connection.pinging = true;
			}
		}
	}
}

function getFilePath(file, callback) {
	chrome.fileSystem.getDisplayPath(file, callback);
}

function getFileEntry(item, callback) {
	if (item.fileEntry) {
		callback(item.fileEntry);
	} else {
		chrome.fileSystem.restoreEntry(item.id, callback);
	}
}

/**
 * Gets the code for given item
 * 
 * @param {object} item The item to check for
 * @returns {string} The item's current code
 */
function getCode(item, callback) {
	getFileEntry(item, function(fileEntry) {
		fileEntry.file(function(file) {
			var reader = new FileReader();
			reader.onerror = function() {
				callback(false);
			}
			reader.onload = function(e) {
				callback(e.target.result);
			};
			reader.readAsText(file);
		});
	});
}

function saveCode(item, callback) {
	getCode(item, function(code) {
		if (code !== false) {
			var filesCopy = {};
			for (file in files) {
				if (files.hasOwnProperty(file)) {
					filesCopy[file.id] = {
						code: file.code,
						id: file.id
					}
				}
			}
			if (filesCopy[item.id]) {
				filesCopy[item.id].code = code;
				files[item.id].code = code;
			} else {
				var newFile = {
					code: code,
					id: item.id
				};
				filesCopy[item.id] = newFile;
				files[item.id] = newFile;
			}
			chrome.storage.local.set({ files: filesCopy });
			callback(filesCopy);
		}
	});
}

function saveCurrentCode(all, item) {
	if (all) {
		var items = [];
		var done = 0;
		var length = currentlyEditing.length;
		currentlyEditing.forEach(function(item) {
			getCode(item, function(code) {
				items[item.id] = {
					id: item.id,
					code: code
				};
				done++;
				if (done === length) {
					chrome.storage.local.set({ files: items });
				}
			});
		});
	} else {
		saveCode(item, function (files) {
			chrome.storage.local.set({ files: files });
		});
	}
}

chrome.notifications.onButtonClicked.addListener(function() {
	for (connection in connections) {
		if (connections.hasOwnProperty(connection)) {
			connection.port.postMessage({
				status: 'connected',
				action: 'hideNotifications',
				connectionId: connection.id
			});
		}
	}
});

/**
 * Shows a notification that file with name "name" is now editable
 * @param {string} name The name of the file
 */
function showConnectedNotification(name, urlPath) {
	chrome.notifications.create({
		type: 'basic',
		title: 'File ' + name + ' now editable',
		message: 'The file ' + name + '.js is now editable located at ' + urlPath + '.',
		iconUrl: 'editImg.svg',
		buttons: {
			title: 'Stop showing these notifications'
		}
	});
}

function waitForIO (writer, callback) {
	var _this = this;
	var start = Date.now();
	var reentrant = function () {
		if (writer.readyState === writer.WRITING && Date.now() - start < 4000) {
			setTimeout(reentrant, 100);
			return;
		}
		if (writer.readyState === writer.WRITING) {
			_this.writeErrorHandler();
			writer.abort();
		}
		else {
			callback();
		}
	};
	setTimeout(reentrant, 100);
}

/*
 * Pushes the code to a file's contents
 * 
 * @param {object} file The file for which to push the code
 * @param {string} code The code to push
 */
function pushFileCode(file, code, callback) {
	file.createWriter(function (writer) {
		writer.onwriteend = callback;

		var blob = new Blob([code], { type: 'text/javascript' });
		writer.truncate(blob.size);
		waitForIO(writer, function () {
			writer.seek(0);
			writer.write(blob);
		});
	});
}

/**
 * Sets up the code for the file, letting the user choose which to keep
 * 
 * @param {object} file The file for which to update the code
 * @param {string} newCode The code to insert
 */
function setupFileCode(file, newCode) {
	var fileCode;
	getCode(file, function(code) {
		fileCode = code;
		if (fileCode !== false && fileCode !== newCode) {
			//Let the user choose whether to keep the local copy or the extension's copy
			function tempListener(msg) {
				if (msg.status === 'connected' && msg.action === 'chooseScript') {
					var addToEditing = function() {
						currentlyEditing.push(file);
						file.currentlyEditing = true;
						getFileEntry(file, function(path) {
							showConnectedNotification(file.name, path);
						});
					}
					if (msg.choice === 'local') {
						pushFileCode(file, newCode, addToEditing);
					} else {
						pushFileCode(file, fileCode, addToEditing);
					}

				}
			}

			file.connection.port.onMessage.addListener(tempListener);
			file.connection.port.postMessage({
				status: 'connected',
				action: 'chooseScript',
				local: newCode,
				external: fileCode,
				connectionId: file.connection.id
			});
		}
	});
}

/**
 * Initialises the script with its connection and external file
 * 
 * @param {object} connection The connection on which the message was sent
 * @param {object} msg The message sent by the extension
 */
function setupScript(connection, msg) {
	var file;
	if (connection.file) {
		//Already has a file connected, clear that first
		removeFromArray(currentlyEditing, connection.file);
		connection.file.currentlyEditing = false;
		connection.file.connection = null;
		checkAliveConnections();
	}
	if (msg.id) {
		file = files[msg.id];
	}
	if (file) {
		//File already exists
		file.connection = connection;
		connection.file = file;
		setupFileCode(file, msg.code);
		connection.port.postMessage({
			status: 'connected',
			action: 'setupScript',
			existed: true,
			connectionId: connection.id
		});
		file.currentlyEditing = true;
		currentlyEditing.push(file);
		connection.fileConnected = true;
	} else {
		//Set up the file
		file = {
			code: msg.code
		};
		chooseFileLocation(msg.name, msg.code, function (id) {
			file.id = id;
			getFileEntry(file, function(fileEntry) {
				getFilePath(fileEntry, function(path) {
					connection.port.postMessage({
						status: 'connected',
						action: 'setupScript',
						existed: false,
						id: id,
						path: path,
						connectionId: connection.id
					});
					file.id = id;
					file.connection = connection;
					file.fileEntry = fileEntry;
					connection.file = file;
					connection.fileConnected = true;
					saveCurrentCode(false, file);
					file.currentlyEditing = true;
					currentlyEditing.push(file);
				});
			});
		});
	}
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
		case 'refreshFromApp':
			try {
				if (connection.fileConnected) {
					getCode(connection.file, function(code) {
						connection.port.postMessage({
							status: 'connected',
							action: 'updateFromApp',
							connectionId: connection.id,
							code: code
						});
					});
				}
			} catch (e) {
				//Port is no longer valid, remove it from currentlyEditing and from ports
				if (connection.file.currentlyEditing) {
					removeFromArray(currentlyEditing, connection.file);
					connection.file.currentlyEditing = false;
					delete connections[connection.id];
				}
			}
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
	getCode(item, function(newCode) {
		if (newCode !== false && newCode !== item.code) {
			item.code = newCode;
			item.connection.port.postMessage({
				status: 'connected',
				action: 'updateFromApp',
				code: newCode,
				connectionId: item.connection.id
			});
		}
	});
}

/*
 * Every minute push all code from open files back to the extensions
 */
function updateCodeForAll() {
	saveCurrentCode(true);
	currentlyEditing.forEach(function(item) {
		updateCode(item);
	});
}

window.setInterval(checkAliveConnections, 30000);

window.setInterval(updateCodeForAll, 5000);

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
	if (port.sender.id === 'obnfehdnkjmbijebdllfcnccllcfceli') { //Change iebkmapbaaghplacacpiagklbhenekhl') {
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
		port.onMessage.addListener(handler);
		port.onDisconnect.addListener(createDeletionHandler(idNum));
	}
});