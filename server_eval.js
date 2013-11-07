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

//event trigger functions used to decouple from ui
ServerEval = {
	serverStateChanged: function(state) {
		var serverStateEvent = $.Event("server-eval-server-state", state);
		jQuery.event.props.push("dataTransfer");
		$("body").trigger(serverStateEvent);
	},
	newResult: function(result_doc) {
		var newResultEvent = $.Event("server-eval-new-result", result_doc);
		$("body").trigger(newResultEvent);
	},
	metadataChanged: function(metadata) {
		var metadatEvent = $.Event("server-eval-metadata", metadata);
		$("body").trigger(metadatEvent);
	},
	watchChanged: function(watch_result) {
		var watchEvent = $.Event("server-eval-watch", watch_result);
		$("body").trigger(watchEvent);
	},
	watchRemoved: function(watch_result) {
		var watchEvent = $.Event("server-eval-watch-removed", watch_result);
		$("body").trigger(watchEvent);
	}
};

//sets current connection state (UP or DOWN)
var _setServerState = function(state) {
	if (SERVER_STATES._current !== state) {
		SERVER_STATES._current = state;
		ServerEval.serverStateChanged({
			state_txt: state + " [PORT: " + (currentPort || PORT) + "]",
			state_type: state === SERVER_STATES.UP ? "SUCCESS" : "ERROR"
		});
	}
};

//handler for a successful ddp connection
//starts subscriptions and server polling
var _setupDataTransfer = function() {
	currentPort = PORT;
	_setServerState(SERVER_STATES.UP);
	//watch ServerEval.results()
	ddp.watch("server-eval-results", function(doc, msg) {
		if (msg === "added") {
			ServerEval.newResult({
				result_doc: doc
			});
		}
	});
	ddp.subscribe("server-eval-results");

	//3 second timeout than assume that server doesn't use server-eval
	var metaDataTimeout = setTimeout(function() {
		ServerEval.serverStateChanged({
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
				ServerEval.serverStateChanged({
					state_txt: "server-eval [PORT: " + currentPort + ']' + " wrong version, expected: " + VERSION + " found: " + serverEvalVersion,
					state_type: "ERROR"
				});
			}
			ServerEval.metadataChanged({
				supported_packages: doc.supported_packages
			});
		}
	});
	ddp.subscribe("server-eval-metadata");

	//watch ServerEval.watch()
	ddp.watch("server-eval-watch", function(doc, msg) {
		if (msg === "added" || msg === "changed") {
			ServerEval.watchChanged({
				watch_result: doc
			});
		} else if (msg === "removed") {
			ServerEval.watchRemoved({
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
			_setServerState(SERVER_STATES.DOWN);
			init();
		}
	}, 1000);
};

//connect to the server or wait until a connection attempt is successful
var init = function() {
	ddp = new MeteorDdp("ws://localhost:" + PORT + "/websocket");
	ddp.connect().then(function() {
		_setupDataTransfer();
	}, /* no connection, try again in 2s */ function() {
		setTimeout(function() {
			_setServerState(SERVER_STATES.DOWN);
			init();
		}, 1000);
	});
};