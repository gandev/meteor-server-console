var ddp;
var expressions = [];
var exprCursor = 0;

var STATES = {
	UP: "--> server up <--",
	DOWN: "--> server down <--"
};

function jumpToPageBottom() {
	$('html, body').scrollTop($(document).height() - $(window).height());
}

$(document).ready(function() {
	var exprCursorState = "bottom";
	var treeCount = 0;

	var newExpression = function(expr) {
		expressions = _.filter(expressions, function(e) {
			return e !== expr;
		});
		expressions.push(expr);
		exprCursor = expressions.length - 1;
		exprCursorState = "bottom";
	};

	var typeString = function(value) {
		return _.isArray(value) ? "[Array[" + value.length + "]]" : "[Object]";
	};

	var objectToTreeData = function(obj, first) {
		var tree_data = [];
		if (_.isObject(obj)) {
			for (var key in obj) {
				var value = obj[key];
				var sub_tree;
				if (_.isObject(value)) {
					sub_tree = {
						'label': key + ": " + typeString(value),
						'children': objectToTreeData(value, false)
					};
				} else {
					sub_tree = {
						'label': key + ": " + value
					};
				}

				if (first) {
					tree_data.length === 0 && tree_data.push({
						'label': typeString(obj),
						'children': []
					});
					tree_data[0].children.push(sub_tree);
				} else {
					tree_data.push(sub_tree);
				}
			}
		}
		return tree_data;
	};

	var newEntry = function(doc, _internal) {
		var result_html;
		var tree_name;
		if (_.isObject(doc.result)) {
			tree_name = "tree" + treeCount++;
			result_html = '<div class="eval_trees" id="' + tree_name + '"></div>';
		} else {
			result_html = '<div>' + doc.result + '</div>';
		}

		var content = '<span>' + result_html + '</span>';
		if (!_internal) {
			content = '<span><p># ' + doc.expr + '</p></span>' + content;
		}

		var new_result = $('<div class="result">' + content + '</div>');
		new_result.css("top", 0);
		$(".output").append(new_result);

		if (_.isObject(doc.result)) {
			$('#' + tree_name).tree({
				data: objectToTreeData(doc.result, true)
			});
		}
		jumpToPageBottom();
	};

	var clearEntries = function() {
		$.when(ddp.call("serverEval/clear")).then(function() {
			treeCount = 0;
			$(".result").remove();
		});
	};

	var setup = function() {
		newEntry({
			result: STATES.UP
		}, true);
		//watch ServerEval.results()
		ddp.watch("eval-results", function(doc, msg) {
			if (msg === "added") {
				var _ = doc.expr && newExpression(doc.expr);
				newEntry(doc);
			}
		});
		var nIntervId = setInterval(function() {
			ddp.send({
				"ping": "h"
			});
			if (ddp.sock.readyState === 3) {
				clearInterval(nIntervId);
				newEntry({
					result: STATES.DOWN
				}, true);
				init();
			}
		}, 2000);
		ddp.subscribe("eval-results");
	};

	var init = function() {
		ddp = new MeteorDdp("ws://localhost:3000/websocket");
		ddp.connect().then(setup);
	};

	init();

	$("#run_eval").bind('keyup', function(evt) {
		if (evt.keyCode == 13) /* enter */ {
			var eval_str = $("#run_eval").val();
			if (eval_str === ".clear") {
				clearEntries();
			} else {
				ddp.call("serverEval/eval", [eval_str]);
			}
			$("#run_eval").val("");
		} else if (evt.keyCode == 38) /*up*/ {
			if (exprCursor > 0) {
				if (exprCursorState === 'up') {
					exprCursor--;
				}
				$("#run_eval").val(expressions[exprCursor]);
				exprCursorState = "up";
			} else if (exprCursor === 0) {
				$("#run_eval").val(expressions[exprCursor]);
			}
		} else if (evt.keyCode == 40) /*down*/ {
			if (exprCursor < expressions.length - 1) {
				if (exprCursorState === 'down') {
					exprCursor++;
				}
				$("#run_eval").val(expressions[exprCursor + 1]);
				exprCursorState = "down";
			} else {
				$("#run_eval").val("");
				exprCursorState = "bottom";
			}
		}
	});
});