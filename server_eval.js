(function() {

	var VERSION = "0.5";
	var ddp;
	var HOST = "localhost"; //"192.168.1.102";
	var PORT = 3000; //default like meteor
	var currentPort;
	var currentHost;
	var result_sub_ready = false;
	//local copy of server-eval metadata
	var serverEvalPackages = [];
	var serverEvalVersion;
	//constants for internal messages
	var SERVER_STATES = {
		UP: "connection up",
		DOWN: "connection down",
		_current: null
	};

	var last_crash_message;
	var http_to_server = new XMLHttpRequest();

	var result_listeners = $.Callbacks();
	var server_state_listeners = $.Callbacks();
	var metadata_listeners = $.Callbacks();
	var watch_update_listeners = $.Callbacks();
	var watch_removed_listeners = $.Callbacks();

	var origin;
	var chrome_ext_detected = !! window.location.origin.match(/^chrome-extension:\/\//);
	var chrome_extension_loaded = false;

	var setOrigin = function() {
		origin = HOST + ":" + PORT;
		setupDDP();
	};

	ServerEval = {
		removeWatch: function(id) {
			ddp.call('serverEval/removeWatch', [id]);
		},
		eval: function(expr, options) {
			ddp.call('serverEval/eval', [expr, options]);
		},
		executeHelper: function(command, args) {
			ddp.call('serverEval/executeHelper', [command, args]);
		},
		clear: function() {
			ddp.call('serverEval/clear');
		},
		init: function() {
			initCommunication();
		},
		changeServer: function(host, port) {
			var restart = false;
			if (_.isString(host) && host !== HOST) {
				HOST = host;
				restart = true;
			}
			if (!isNaN(port) && port !== PORT) {
				PORT = port;
				restart = true;
			}
			if (restart) {
				setOrigin();
			}
		},
		currentPort: function() {
			return currentPort;
		},
		currentHost: function() {
			return currentHost;
		},
		listenForServerState: function(cb) {
			server_state_listeners.add(cb);
		},
		listenForNewResults: function(cb) {
			result_listeners.add(cb);
		},
		listenForMetadata: function(cb) {
			metadata_listeners.add(cb);
		},
		listenForWatchUpdates: function(cb) {
			watch_update_listeners.add(cb);
		},
		listenForWatchRemoved: function(cb) {
			watch_removed_listeners.add(cb);
		},
		_serverStateChanged: function(state) {
			server_state_listeners.fire(state);
		},
		_newResult: function(result_doc) {
			result_listeners.fire(result_doc);
		},
		_metadataChanged: function(metadata) {
			metadata_listeners.fire(metadata);
		},
		_watchChanged: function(watch_result) {
			watch_update_listeners.fire(watch_result);
		},
		_watchRemoved: function(watch_result) {
			watch_removed_listeners.fire(watch_result);
		},
		_isResultSubReady: function() {
			return result_sub_ready;
		}
	};

	//sets current connection state (UP or DOWN)
	var setServerState = function(state) {
		if (SERVER_STATES._current !== state) {
			SERVER_STATES._current = state;
			ServerEval._serverStateChanged({
				state_txt: state + " [" + (currentHost || 'localhost') + ':' + (currentPort || PORT) + "]",
				state_type: state === SERVER_STATES.UP ? "SUCCESS" : "ERROR"
			});
		}
	};

	//handler for a successful ddp connection
	//starts subscriptions and server polling
	var setupDataTransfer = function() {
		currentPort = PORT;
		currentHost = HOST;
		setServerState(SERVER_STATES.UP);

		last_crash_message = null;

		//3 second timeout than assume that server doesn't use server-eval
		var metaDataTimeout = setTimeout(function() {
			ServerEval._serverStateChanged({
				state_txt: 'server-eval missing on server: [' + currentHost + ':' + currentPort + ']',
				state_type: "ERROR"
			});
		}, 3000);

		//watch ServerEval.metadata()
		ddp.watch("server-eval-metadata", function(doc, msg) {
			if (msg === "added" || msg === "changed") {
				clearTimeout(metaDataTimeout);
				serverEvalPackages = doc.packages;
				serverEvalVersion = doc.version;
				if (serverEvalVersion !== VERSION) {
					ServerEval._serverStateChanged({
						state_txt: 'server-eval [' + currentHost + ':' + currentPort + ']' + " wrong version, expected: " + VERSION + " found: " + serverEvalVersion,
						state_type: "ERROR"
					});
				}
				ServerEval._metadataChanged({
					supported_packages: doc.supported_packages,
					helpers: doc.helpers
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

		//watch ServerEval.results()
		ddp.watch("server-eval-results", function(doc, msg) {
			if (msg === "added") {
				ServerEval._newResult({
					result_doc: doc
				});
			}
		});

		ddp.subscribe("server-eval-results").then(function() {
			result_sub_ready = true;
		}, function() {
			result_sub_ready = false;
		});

		// poll server and try reinit when server down
		var checkConnectionInterval = setInterval(function() {
			if (ddp.sock.readyState !== 1 /* 1 = CONNECTED, 3 = CLOSED */ ) {
				clearInterval(checkConnectionInterval);
				setServerState(SERVER_STATES.DOWN);
				publishServerCrashErrorMessage();
				setupDDP();
			} else {
				ddp.send({
					"ping": "h"
				});
			}
		}, 300);
	};

	var createCrashMessage = function(message) {
		if (message.match(/^Your app is crashing/) && last_crash_message !== message) {
			last_crash_message = message;
		} else {
			return;
		}

		ServerEval._newResult({
			result_doc: {
				eval_time: Date.now(),
				log: true,
				err: true,
				result: {
					message: last_crash_message
				}
			}
		});
	};

	var requestCrashPage = function() {
		http_to_server.onload = function() {
			createCrashMessage(this.responseText);
		};
		http_to_server.open("post", 'http://' + origin + "/", true);
		http_to_server.timeout = 1000;
		http_to_server.send();
	};

	var publishServerCrashErrorMessage = function() {
		if (window.MeteorConsole_getCrashMessage) {
			//workaround because of CORS and crash page
			window.MeteorConsole_getCrashMessage('http://' + origin, function(msg) {
				if (!msg) {
					requestCrashPage();
					return;
				}
				createCrashMessage(msg);
			});
		} else {
			requestCrashPage();
		}
	};

	var reconnectTimeout;

	//connect to the server or wait until a connection attempt is successful
	var setupDDP = function() {
		if (ddp) {
			clearTimeout(reconnectTimeout);
			ddp.close();
		}
		ddp = new MeteorDdp("ws://" + origin + "/websocket");

		ddp.connect().then(function() {
			clearTimeout(reconnectTimeout);
			setupDataTransfer();
		}, /* no connection, try again */ function() {
			currentPort = PORT;
			reconnectTimeout = setTimeout(function() {
				setServerState(SERVER_STATES.DOWN);
				publishServerCrashErrorMessage();
				initCommunication();
			}, 1000);
		});
	};

	var initCommunication = function() {
		if (chrome_ext_detected && window.MeteorConsole_getOrigin && !chrome_extension_loaded) {
			chrome_extension_loaded = true;
			window.MeteorConsole_getOrigin(function(origin) {
				var origin_match = [];
				if (origin) {
					origin_match = origin.match(/^http:\/\/([\w\.-]*):(\d*)/);
				}
				if (origin_match && origin_match.length == 3) {
					HOST = origin_match[1];
					PORT = origin_match[2];
				}
				setOrigin();
			});
		} else if (!chrome_ext_detected || chrome_ext_detected && chrome_extension_loaded) {
			setOrigin();
		} else {
			//startup delay, to wait until chrome-extension loaded
			setTimeout(function() {
				initCommunication();
			}, 500);
		}
	};

})();