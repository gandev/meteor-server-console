var VERSION = "0.3";

var expressionHistory = [];
//vars to track selection in last expression history
var exprCursor = 0;
var exprCursorState = "bottom";

//scope in which new expressions should be evaluated
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
		switch (doc.state_type) {
			case "MSG":
				lbl = "warning";
				break;
			case "ERROR":
				lbl = "danger";
				break;
			case "SUCCESS":
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

var watches = [];

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
			result: 'changed port to [PORT: ' + PORT + ']',
			state_type: "MSG"
		}, true);
		ddp.close();
		return true;
	} else if (cmd.match(/se:port\d*/)) {
		newOutputEntry({
			result: '[PORT: ' + PORT + ']',
			state_type: 'MSG'
		}, true);
		return true;
	} else if (cmd.match(/se:reset/)) {
		$package_scope.hide();
		package_scope = null;
		return true;
	} else if (cmd.match(/se:new-watch=/)) /* e.g. se:new-watch=Date.now() */ {
		var watch_expr = cmd.split("=")[1];
		if (watch_expr) {
			watches.push(function() {
				ddp.call("serverEval/eval", [watch_expr, {
					'package': package_scope,
					watch: true
				}]);
			});
		}
		watches[watches.length - 1]();
		return true;
	}
	return false;
};

//console handler, catches: up, down and enter key
var consoleHandler = function(evt) {
	if (evt.keyCode == 13) /* enter */ {
		var eval_str = $("#run_eval").val();
		if (!internalCommand(eval_str)) {
			ddp.call("serverEval/eval", [eval_str, {
				'package': package_scope
			}]);
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
	//use server-eval metadata to show supported packages
	var packageTags = _.map(supported_packages || [], function(pkg) {
		return "se:use=" + pkg;
	});

	//autocomplete default commands
	var availableTags = [
		"se:set-port=",
		"se:set-port=3000",
		"se:port",
		"se:reset",
		"se:new-watch=",
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

$(document).ready(function() {
	//wire and initialize ui
	$("#run_eval").bind('keyup', consoleHandler);
	setupAutocomplete();

	//server eval events
	$('body').on('server-eval-server-state', function(evt) {
		newOutputEntry({
			result: evt.state_txt,
			state_type: evt.state_type
		}, true);
	});

	$('body').on('server-eval-metadata', function(evt) {
		setupAutocomplete(evt.supported_packages);
	});

	$('body').on('server-eval-watch', function(evt) {
		console.log(evt.watch_result);
	});

	$('body').on('server-eval-new-result', function(evt) {
		var _call = evt.result_doc && evt.result_doc.expr && newExpression(evt.result_doc.expr);
		//TODO get rid of some old data automatically!?
		//because of serious performance issue with really big results
		//
		//console.time("render-result-time");
		newOutputEntry(evt.result_doc);
		//console.timeEnd("render-result-time");
	});

	//start communication
	init();
});