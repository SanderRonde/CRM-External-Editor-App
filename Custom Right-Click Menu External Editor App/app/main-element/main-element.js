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
		},
		isMove: {
			type: Boolean,
			notify: true,
			value: false
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
					extensions: (window.isCss ? ['css'] : ['js'])
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
		chrome.app.window.current().close();
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

	ready: function() {
		window.el = this;
		window.isMove && (this.isMove = true);
	}
});