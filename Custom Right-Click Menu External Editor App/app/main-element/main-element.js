///<reference path="../../references/_references.js"/>
Polymer({
	is: 'main-element',

	properties: {
		fileEntry: {
			type: Object,
			value: null
		},
		locationName: {
			type: String,
			notify: true,
			value: '',
			computed: 'getFileName(fileEntry)'
		},
		buttonDisabled: {
			type: Boolean,
			value: true,
			notify: true,
			computed: 'disableButton(locationName)'
		}
	},

	disableButton: function () {
		return (!this.locationName);
	},

	getFileName: function () {
		var _this = this;
		if (this.fileEntry) {
			chrome.fileSystem.getDisplayPath(this.fileEntry, function (path) {
				_this.locationName = path;
			});
		}
	},

	setLocation: function() {
		var _this = this;
		chrome.fileSystem.chooseEntry({
			type: 'saveFile',
			suggestedName: window.name,
			accepts: [
				{
					extensions: ['js']
				}
			]
		}, function (fileEntry) {
			if (!chrome.runtime.lastError) {
				_this.fileEntry = fileEntry;
			}
			_this.$.errorTxt.style.visiblity = 'visible';
		});
	},

	writerErrorHandler: function() {
		window.el.$.errorTxt.style.visiblity = 'visible';
	},

	finishWriting: function() {
		window.onFinish(chrome.fileSystem.retainEntry(window.el.fileEntry));
	},

	waitForIO: function (writer, callback) {
		var _this = this;
		// set a watchdog to avoid eventual locking:
		var start = Date.now();
		// wait for a few seconds
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
	},

	createFile: function() {
		var _this = this;
		this.fileEntry.createWriter(function(writer) {
			writer.onerror = _this.writerErrorHandler;
			writer.onwriteend = _this.finishWriting;

			var txt = window.content;
			var blob = new Blob([txt], { type: 'text/javascript' });
			writer.truncate(blob.size);
			_this.waitForIO(writer, function() {
				writer.seek(0);
				writer.write(blob);
			});
		}, _this.writerErrorHandler);
	},

	ready: function() {
		window.el = this;
	}
});