var ddp;
var serverEvalPackages = [];
var serverEvalVersion;
var expressionHistory = [];
var exprCursor = 0;

var SERVER_STATES = {
	UP: "--> server up <--",
	DOWN: "--> server down <--",
	_current: null
};

var exprCursorState = "bottom";
var package_scope;

//scrolls the page to the bottom, 
//is called to always see the input even if results are higher then window height
var jumpToPageBottom = function() {
	$('html, body').scrollTop($(document).height() - $(window).height());
};

//add expression to history or move it to the end + reset cursor/cursor state
var newExpression = function(expr) {
	expressionHistory = _.filter(expressionHistory, function(e) {
		return e !== expr;
	});
	expressionHistory.push(expr);
	exprCursor = expressionHistory.length - 1;
	exprCursorState = "bottom";
};

//return formatted html string with result type name and color style
//server-eval smartpackage adds custom property:
//  ____TYPE____ for special objects (e.g. Error, Function, ...) 
var typeHtml = function(value) {
	var type = "unknown";
	var type_style = 'style="color: ';
	if (value.____TYPE____) {
		type = value.____TYPE____;
		if (type === "[Circular]") {
			type_style += 'red;"';
		} else if (type === "[Error]") {
			type += " " + value.err;
			type_style += 'red;"';
		} else if (type == "[Function]") {
			type_style += 'blue;"';
		} else {
			type_style += 'gray;"';
		}
	} else if (_.isArray(value)) {
		type = '[Array[' + value.length + ']]';
		type_style += 'orange;"';
	} else if (_.isObject(value)) {
		type = '[Object]';
		type_style += 'green;"';
	} else {
		type = 'null';
		type_style += 'red;"';
	}
	return '<span ' + type_style + '>' + type + "</span>";
};

//converts all kind of result objects in a http://mbraak.github.io/jqTree/ format
//recursive function adding subtrees, subtree subtrees, ...
var objectToTreeData = function(obj, top_level) {
	if (!_.isObject(obj)) return [];

	var tree_data = [];
	var isError = obj.____TYPE____ && obj.____TYPE____ === "[Error]";

	//if error just return the msg in typeHtml and stacktrace
	if (isError) {
		tree_data.push({
			'label': typeHtml(obj),
			'children': objectToTreeData(obj.stack, false)
		});
		return tree_data;
	}

	for (var key in obj) {
		var value = obj[key];
		//dont show special result type property in tree
		if (key === "____TYPE____") {
			continue;
		}

		var sub_tree;
		if (_.isObject(value)) {
			//sub_tree with children (objects)
			sub_tree = {
				'label': key + ": " + typeHtml(value),
				'children': objectToTreeData(value, false)
			};
		} else {
			//sub_tree without children (string, number, boolean)
			sub_tree = {
				'label': key + ": " + (_.isString(value) ?
					'<span style="color: rgb(210, 180, 60);">"' + value + '"</span>' :
					value)
			};
		}

		//top level label is just the typeHtml and properties are direct children
		if (top_level) {
			if (tree_data.length === 0) {
				tree_data.push({
					'label': typeHtml(obj),
					'children': []
				});
			}
			tree_data[0].children.push(sub_tree);
		} else {
			tree_data.push(sub_tree);
		}
	}
	return tree_data;
};

//inserts a new output entry into the dom
//   1. expr + scope + object tree (jqtree)
//   2. expr + scope + plain div with non object result
//   3. internal message (no expression/scope)
var newOutputEntry = function(doc, _internal) {
	var $content;
	if (_.isObject(doc.result)) {
		$content = $('<div class="eval_trees"></div>');
		$content.tree({
			data: objectToTreeData(doc.result, true),
			onCreateLi: function(node, $li) {
				// Append a link to the jqtree-element div.
				var $title = $li.find('.jqtree-title');
				$title.html($title.text());
			}
		});
	} else {
		$content = $('<div>' + doc.result + '</div>');
	}

	var $result_entry = $('<div class="result"></div>');
	if (!_internal) {
		var $eval_expr = $('<div class="eval_expr"><strong>#</strong> ' + doc.expr + '</div>');
		var $eval_scope = $('<span class="label label-primary scope">' + doc.scope + '</span>');
		$eval_expr.append($eval_scope);
		$result_entry.append($eval_expr);
	}

	$result_entry.append($content);
	$(".output").append($result_entry);

	jumpToPageBottom();
};

var clearOutput = function() {
	ddp.call("serverEval/clear").then(function() {
		$(".result").remove();
	});
};

//sets current server state (UP or DOWN) and inserts internal output entry
var setServerState = function(state) {
	if (SERVER_STATES._current !== state) {
		SERVER_STATES._current = state;
		newOutputEntry({
			result: state
		}, true);
	}
};

var internalCommand = function(cmd) {
	var $package_scope = $('#input_info span');
	if (cmd === ".clear") {
		clearOutput();
		return true;
	} else if (cmd.match(/se:use=.*/)) /* e.g. se:use=custom-package */ {
		package_scope = cmd.split("=")[1];
		var $new_scope = $('<span style="margin-left: 10px;" class="label label-primary">' + package_scope + '</span>');
		if ($package_scope.length > 0) {
			$package_scope.replaceWith($new_scope);
		} else {
			$('#input_info').append($new_scope);
		}
		return true;
	} else if (cmd.match(/se:reset/)) /* e.g. se:use=custom-package */ {
		$package_scope.remove();
		package_scope = null;
		return true;
	}
	return false;
};

//console handler
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

var setupAutocomplete = function() {
	var packageTags = _.map(serverEvalPackages, function(pkg) {
		return "se:use=" + pkg;
	});

	//autocomplete
	var availableTags = [
		"se:use=",
		"se:reset"
	];

	availableTags = availableTags.concat(packageTags);

	$("#run_eval").autocomplete({
		source: availableTags,
		position: {
			my: "left bottom",
			at: "left top",
			collision: "flip"
		},
		minLength: 3,
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
	setServerState(SERVER_STATES.UP);
	//watch ServerEval.results()
	ddp.watch("server-eval-results", function(doc, msg) {
		if (msg === "added") {
			var _call = doc.expr && newExpression(doc.expr);
			newOutputEntry(doc);
		}
	});
	ddp.subscribe("server-eval-results");

	//watch ServerEval.metadata()
	ddp.watch("server-eval-metadata", function(doc, msg) {
		if (msg === "added") {
			serverEvalPackages = doc.packages;
			serverEvalVersion = doc.version;
			setupAutocomplete();
		}
	});
	ddp.subscribe("server-eval-metadata");

	// poll server and reconnect when server down
	var nIntervId = setInterval(function() {
		ddp.send({
			"ping": "h"
		});
		if (ddp.sock.readyState === 3 /* CLOSED */ ) {
			clearInterval(nIntervId);
			setServerState(SERVER_STATES.DOWN);
			init();
		}
	}, 2000);
};

//connect to the server or wait until a connection attempt is successful
var init = function() {
	ddp = new MeteorDdp("ws://localhost:3000/websocket");
	ddp.connect().then(function() {
		setupDataTransfer();
	}, /* no connection, try again in 2s */ function() {
		setTimeout(function() {
			setServerState(SERVER_STATES.DOWN);
			init();
		}, 2000);
	});
};

$(document).ready(function() {
	$("#run_eval").bind('keyup', consoleHandler);
	setupAutocomplete();

	init();
});