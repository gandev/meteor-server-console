(function() {

	var ddp;
	var PORT = 3000; //default like meteor
	var currentPort;
	//local copy of server-eval metadata
	var serverEvalPackages = [];
	var serverEvalVersion;
	//constants for internal messages
	var SERVER_STATES = {
		UP: "connection up",
		DOWN: "connection down",
		_current: null
	};


	ServerEval = {
		removeWatch: function(id) {
			ddp.call('serverEval/removeWatch', [id]);
		},
		eval: function(expr, options) {
			ddp.call('serverEval/eval', [expr, options]);
		},
		clear: function() {
			ddp.call('serverEval/clear');
		},
		init: function() {
			initCommunication();
		},
		changeServer: function(port) {
			if (!isNaN(port) && port !== PORT) {
				PORT = port;
				ddp.close();
			}
		},
		currentPort: function() {
			return currentPort;
		},
		listenForServerState: function(cb) {
			$('body').on('server-eval-server-state', cb);
		},
		listenForNewResults: function(cb) {
			$('body').on('server-eval-new-result', cb);
		},
		listenForMetadata: function(cb) {
			$('body').on('server-eval-metadata', cb);
		},
		listenForWatchUpdates: function(cb) {
			$('body').on('server-eval-watch', cb);
		},
		listenForWatchRemoved: function(cb) {
			$('body').on('server-eval-watch-removed', cb);
		},
		_serverStateChanged: function(state) {
			var serverStateEvent = $.Event("server-eval-server-state", state);
			jQuery.event.props.push("dataTransfer");
			$("body").trigger(serverStateEvent);
		},
		_newResult: function(result_doc) {
			var newResultEvent = $.Event("server-eval-new-result", result_doc);
			$("body").trigger(newResultEvent);
		},
		_metadataChanged: function(metadata) {
			var metadatEvent = $.Event("server-eval-metadata", metadata);
			$("body").trigger(metadatEvent);
		},
		_watchChanged: function(watch_result) {
			var watchEvent = $.Event("server-eval-watch", watch_result);
			$("body").trigger(watchEvent);
		},
		_watchRemoved: function(watch_result) {
			var watchEvent = $.Event("server-eval-watch-removed", watch_result);
			$("body").trigger(watchEvent);
		}
	};

	//sets current connection state (UP or DOWN)
	var setServerState = function(state) {
		if (SERVER_STATES._current !== state) {
			SERVER_STATES._current = state;
			ServerEval._serverStateChanged({
				state_txt: state + " [PORT: " + (currentPort || PORT) + "]",
				state_type: state === SERVER_STATES.UP ? "SUCCESS" : "ERROR"
			});
		}
	};

	//handler for a successful ddp connection
	//starts subscriptions and server polling
	var setupDataTransfer = function() {
		currentPort = PORT;
		setServerState(SERVER_STATES.UP);
		//watch ServerEval.results()
		ddp.watch("server-eval-results", function(doc, msg) {
			if (msg === "added") {
				ServerEval._newResult({
					result_doc: doc
				});
			}
		});
		ddp.subscribe("server-eval-results");

		//3 second timeout than assume that server doesn't use server-eval
		var metaDataTimeout = setTimeout(function() {
			ServerEval._serverStateChanged({
				state_txt: "server-eval missing on server: [PORT: " + currentPort + ']',
				state_type: "ERROR"
			});
		}, 3000);

		//watch ServerEval.metadata()
		ddp.watch("server-eval-metadata", function(doc, msg) {
			if (msg === "added") {
				clearTimeout(metaDataTimeout);
				serverEvalPackages = doc.packages;
				serverEvalVersion = doc.version;
				if (serverEvalVersion !== VERSION) {
					ServerEval._serverStateChanged({
						state_txt: "server-eval [PORT: " + currentPort + ']' + " wrong version, expected: " + VERSION + " found: " + serverEvalVersion,
						state_type: "ERROR"
					});
				}
				ServerEval._metadataChanged({
					supported_packages: doc.supported_packages
				});
			}
		});
		ddp.subscribe("server-eval-metadata");

		//watch ServerEval.watch()
		ddp.watch("server-eval-watch", function(doc, msg) {
			if (msg === "added" || msg === "changed") {
				var watch_result = JSON.parse(doc.result);
				watch_result._id = doc._id;
				ServerEval._watchChanged({
					watch_result: watch_result
				});
			} else if (msg === "removed") {
				ServerEval._watchRemoved({
					watch_id: doc._id
				});
			}
		});
		ddp.subscribe("server-eval-watch");

		// poll server and try reinit when server down
		var nIntervId = setInterval(function() {
			ddp.send({
				"ping": "h"
			});
			if (ddp.sock.readyState === 3 /* CLOSED */ ) {
				clearInterval(nIntervId);
				setServerState(SERVER_STATES.DOWN);
				initCommunication();
			}
		}, 1000);
	};

	//connect to the server or wait until a connection attempt is successful
	var initCommunication = function() {
		ddp = new MeteorDdp("ws://localhost:" + PORT + "/websocket");
		ddp.connect().then(function() {
			setupDataTransfer();
		}, /* no connection, try again in 2s */ function() {
			currentPort = PORT;
			setTimeout(function() {
				setServerState(SERVER_STATES.DOWN);
				initCommunication();
			}, 1000);
		});
	};

})();