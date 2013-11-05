var ddp;
var serverEvalPackages = [];
var serverEvalVersion;
var expressionHistory = [];
var exprCursor = 0;
var currentPort;

var VERSION = "0.3";

var PORT = 3000; //default like meteor

var SERVER_STATES = {
	UP: "connection up",
	DOWN: "connection down",
	_current: null
};
var ERROR = 1;
var MSG = 2;
var SUCCESS = 3;

var exprCursorState = "bottom";
var package_scope;

//add expression to history or move it to the end + reset cursor/cursor state
var newExpression = function(expr) {
	expressionHistory = _.filter(expressionHistory, function(e) {
		return e !== expr;
	});
	expressionHistory.push(expr);
	exprCursor = expressionHistory.length - 1;
	exprCursorState = "bottom";
};

//inserts a new output entry into the dom
//   1. expr + scope + object tree (jqtree)
//   2. expr + scope + plain div with non object result
//   3. internal message (no expression/scope)
var newOutputEntry = function(doc, _internal) {
	var $content;
	if (_.isObject(doc.result)) {
		$content = $('#object_output_tmpl').clone();
		$content.find('.eval_tree').tree({
			data: objectToTreeData(doc.result, true),
			onCreateLi: function(node, $li) {
				// Append a link to the jqtree-element div.
				var $title = $li.find('.jqtree-title');
				$title.html($title.text());
			}
		}).bind('tree.close', function(e) {
			if (!e.node.parent.parent) {
				$("#run_eval").focus();
				jumpToPageBottom();
			}
		});
	} else if (_internal) {
		var lbl = "default";
		switch (_internal) {
			case MSG:
				lbl = "warning";
				break;
			case ERROR:
				lbl = "danger";
				break;
			case SUCCESS:
				lbl = "success";
				break;
		}
		$content = $('#internal_output_tmpl').clone();
		$content.find('.internal_msg span').addClass('label-' + lbl);
		$content.find('.internal_msg span').html(doc.result);

		//show only last 3 internal messages
		if ($(".output .internal_msg").length === 3) {
			$(".output .internal_msg").first().parent().remove();
		}
	} else {
		$content = $('#primitive_output_tmpl').clone();
		$content.find('.eval_primitive').html(wrapPrimitives(doc.result));
	}
	$content.removeAttr('id'); //template id

	//non internal have expression and scope
	$content.find('.eval_expr span').html(doc.expr);
	$content.find('.scope').html(doc.scope);

	$(".output").append($content);

	//is called to always see the input even if results are higher then window height
	jumpToPageBottom();
};

var clearOutput = function() {
	ddp.call("serverEval/clear").then(function() {
		$(".output .result").remove();
	});
};

//sets current server state (UP or DOWN) and inserts internal output entry
var setServerState = function(state) {
	if (SERVER_STATES._current !== state) {
		SERVER_STATES._current = state;
		newOutputEntry({
			result: state + " [PORT: " + (currentPort || PORT) + "]"
		}, state === SERVER_STATES.UP ? SUCCESS : ERROR);
	}
};

var internalCommand = function(cmd) {
	var $package_scope = $('#input_info span');
	if (cmd === ".clear") {
		clearOutput();
		return true;
	} else if (cmd.match(/se:use=.*/)) /* e.g. se:use=custom-package */ {
		package_scope = cmd.split("=")[1];
		$package_scope.html(package_scope);
		$package_scope.show();
		return true;
	} else if (cmd.match(/se:set-port=\d*/)) /* e.g. se:port=4000 */ {
		PORT = cmd.split("=")[1] || PORT;
		newOutputEntry({
			result: 'changed port to [PORT: ' + PORT + ']'
		}, MSG);
		ddp.close();
		return true;
	} else if (cmd.match(/se:port\d*/)) /* e.g. se:port=4000 */ {
		newOutputEntry({
			result: '[PORT: ' + PORT + ']'
		}, MSG);
		return true;
	} else if (cmd.match(/se:reset/)) {
		$package_scope.hide();
		package_scope = null;
		return true;
	}
	return false;
};

//console handler, catches: up, down and enter key
var consoleHandler = function(evt) {
	if (evt.keyCode == 13) /* enter */ {
		var eval_str = $("#run_eval").val();
		if (!internalCommand(eval_str)) {
			ddp.call("serverEval/eval", [eval_str, package_scope]);
		}
		$("#run_eval").val("");
	} else if (evt.keyCode == 38) /*up*/ {
		if (exprCursor > 0) {
			if (exprCursorState === 'up') {
				exprCursor--;
			}
			$("#run_eval").val(expressionHistory[exprCursor]);
			exprCursorState = "up";
		} else if (exprCursor === 0) {
			$("#run_eval").val(expressionHistory[exprCursor]);
		}
	} else if (evt.keyCode == 40) /*down*/ {
		if (exprCursor < expressionHistory.length - 1) {
			if (exprCursorState === 'down') {
				exprCursor++;
			}
			$("#run_eval").val(expressionHistory[exprCursor + 1]);
			exprCursorState = "down";
		} else {
			$("#run_eval").val("");
			exprCursorState = "bottom";
		}
	}
};

var setupAutocomplete = function(supported_packages) {
	var packageTags = _.map(supported_packages || [], function(pkg) {
		return "se:use=" + pkg;
	});

	//autocomplete
	var availableTags = [
		"se:set-port=",
		"se:set-port=3000",
		"se:port",
		"se:reset",
		"se:use="
	];

	availableTags = availableTags.concat(packageTags);

	$("#run_eval").autocomplete({
		position: {
			my: "left bottom",
			at: "left top",
			collision: "flip"
		},
		minLength: 3,
		source: function(request, response) {
			//only allow matches starting with the input (e.g. se:)
			var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex(request.term), "i");
			response($.grep(availableTags, function(item) {
				return matcher.test(item);
			}));
		},
		open: function(event, ui) {
			$("#run_eval").unbind('keyup', consoleHandler);
		},
		close: function(event, ui) {
			//neccessary because selection with enter triggers run_eval keyup
			setTimeout(function() {
				$("#run_eval").bind('keyup', consoleHandler);
			}, 500);
		}
	});
};

//handler for a successful ddp connection
//starts subscriptions and server polling
var setupDataTransfer = function() {
	currentPort = PORT;
	setServerState(SERVER_STATES.UP);
	//watch ServerEval.results()
	ddp.watch("server-eval-results", function(doc, msg) {
		if (msg === "added") {
			var _call = doc.expr && newExpression(doc.expr);
			//TODO get rid of some old data automatically!?
			//because of serious performance issue with really big results
			//
			//console.time("render-result-time");
			newOutputEntry(doc);
			//console.timeEnd("render-result-time");
		}
	});
	ddp.subscribe("server-eval-results");

	//3 second timeout than assume that server doesn't use server-eval
	var metaDataTimeout = setTimeout(function() {
		newOutputEntry({
			result: "server-eval missing on server: [PORT: " + currentPort + ']'
		}, ERROR);
	}, 3000);

	//watch ServerEval.metadata()
	ddp.watch("server-eval-metadata", function(doc, msg) {
		if (msg === "added") {
			clearTimeout(metaDataTimeout);
			serverEvalPackages = doc.packages;
			serverEvalVersion = doc.version;
			if (serverEvalVersion !== VERSION) {
				newOutputEntry({
					result: "server-eval [PORT: " + currentPort + ']' + " wrong version, expected: " + VERSION + " found: " + serverEvalVersion
				}, ERROR);
			}
			setupAutocomplete(doc.supported_packages);
		}
	});
	ddp.subscribe("server-eval-metadata");

	// poll server and try reinit when server down
	var nIntervId = setInterval(function() {
		ddp.send({
			"ping": "h"
		});
		if (ddp.sock.readyState === 3 /* CLOSED */ ) {
			clearInterval(nIntervId);
			setServerState(SERVER_STATES.DOWN);
			init();
		}
	}, 1000);
};

//connect to the server or wait until a connection attempt is successful
var init = function() {
	ddp = new MeteorDdp("ws://localhost:" + PORT + "/websocket");
	ddp.connect().then(function() {
		setupDataTransfer();
	}, /* no connection, try again in 2s */ function() {
		setTimeout(function() {
			setServerState(SERVER_STATES.DOWN);
			init();
		}, 1000);
	});
};

$(document).ready(function() {
	$("#run_eval").bind('keyup', consoleHandler);
	setupAutocomplete();

	init();
});