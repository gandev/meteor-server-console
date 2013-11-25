var VERSION = "0.4";

var WATCH_WIDTH = 30; //percent

var expressionHistory = [];
var watches = {};
//vars to track selection in last expression history
var exprCursor = 0;
var exprCursorState = "bottom";

//scope in which new expressions should be evaluated
var package_scope;

var hiddenWatch = true;
var watch_view_toggling;

var show_autocomplete = false;

//optionally scrolls the page to the bottom of output if results are higher then window height
var positioning = function(scroll) {
	var output_height = $('#output').height();
	var input_height = $('#input_eval').height();

	if (scroll) {
		//scroll to output end
		var top_pos = (output_height + input_height) - $(window).height();
		$(document).scrollTop(top_pos);
		$('#watch_view').animate({
			'top': top_pos < 0 ? 0 : top_pos
		});
	} else {
		//move watch view to the top of the current window, used when scrolling
		var scroll_top = $(document).scrollTop();
		var watch_top = $('#watch_view').position().top;
		var isNotOnTop = scroll_top < watch_top;

		var watch_height = $('#watch_view').height();
		var isOutsideOutput = scroll_top + watch_height < output_height + input_height;
		//prevent moving if watch view is outside of the output, to allow scrolling in watch view
		if (isOutsideOutput || isNotOnTop) {
			$('#watch_view').animate({
				'top': $(document).scrollTop()
			});
		}
	}
};

var setWidth = function(zero, cb) {
	var watch_width = zero ? 0 : $(window).width() * WATCH_WIDTH / 100;
	var console_width = $(window).width() - watch_width;
	$('#console_view').animate({
		right: watch_width,
		width: console_width
	}, function() {
		if (zero) {
			$(this).css('width', '100%');
		}
	});

	$('#watch_view').animate({
		width: watch_width
	}, cb);
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

var createTemplateInstance = function(name, id) {
	var $tmpl_instance = $('#' + name).clone();
	if (id) {
		$tmpl_instance.attr('id', id); //template id
	} else {
		$tmpl_instance.removeAttr('id');
	}
	return $tmpl_instance;
};

var createTree = function($content, result) {
	$content.find('.content').addClass('eval_tree');
	return $content.find('.eval_tree').tree({
		data: objectToTreeData(result, true),
		onCreateLi: function(node, $li) {
			//use text as html because the treedata includes html
			var $title = $li.find('.jqtree-title');
			$title.html($title.text());
		}
	});
};

var createReturnValue = function($content, value, cb) {
	if (_.isObject(value.result)) {
		var tree = createTree($content, value.result);
		if (cb) {
			tree.bind('tree.close', cb);
		}
	} else {
		$content.find('.content').addClass('eval_primitive');
		$content.find('.eval_primitive').html(wrapPrimitives(value.result));
	}

	//expression and scope
	$content.find('.eval_expr span').html(value.expr);
	$content.find('.scope').html(value.scope);
	$content.find('.scope').append(' [' + value.eval_exec_time + 'ms]');
};

var renderWatch = function(watch) {
	if (hiddenWatch) {
		toggleWatch();
	}

	var $content = $("#" + watch._id);
	if ($content.length === 0) {
		$content = createTemplateInstance('watch_tmpl', watch._id);

		$("#watch_view").append($content);
	} else {
		$content.find('.watch_refresh').unbind();
		$content.find('.watch_remove').unbind();
		//produced a flicker when using .tree() again
		$content.find('.eval_tree').replaceWith($('<div class="eval_tree"></div>'));
	}

	createReturnValue($content, watch);

	$content.find('.watch_refresh').bind("click", function() {
		watch.update();
	});

	$content.find('.watch_remove').bind("click", function() {
		ServerEval.removeWatch(watch._id);
	});

	//is called to always see the input even if results are higher then window height
	positioning(true);
};

//inserts a new output entry into the dom
//expr + scope + object tree (jqtree) / plain div with non object result
var renderResult = function(doc) {
	var $content = createTemplateInstance('result_output_tmpl');

	createReturnValue($content, doc, function(e) {
		if (!e.node.parent.parent) {
			$("#run_eval").focus();
			positioning(true);
		}
	});

	$("#output").append($content);

	positioning(true);
};

//inserts a new internal message into the dom
var renderInternalMessage = function(state) {
	var $content = createTemplateInstance('internal_output_tmpl');

	var lbl = "default";
	switch (state.type) {
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
	$content.find('.internal_msg span').addClass('label-' + lbl);
	$content.find('.internal_msg span').html(state.txt);

	//show only last 3 internal messages
	if ($("#output .internal_msg").length === 3) {
		$("#output .internal_msg").first().parent().remove();
	}

	$("#output").append($content);

	positioning(true);
};

var renderAutocomplete = function(doc) {
	var $content = createTemplateInstance('autocomplete_output_tmpl');

	var $table = $content.find('.autocomplete table tbody');
	var column_count = 0;
	var $table_row;
	_.each(doc.result || [], function(value) {
		if (column_count === 0) {
			$table_row = $('<tr></tr>');
		}

		$table_row.append('<td>' + value + '</td>');
		column_count++;

		if (column_count === 4) {
			column_count = 0;
			$table.append($table_row);
			$table_row = null;
		}
	});
	if ($table_row) {
		$table.append($table_row);
	}

	//expression and scope
	$content.find('.eval_expr span').html(doc.expr);
	$content.find('.scope').html(doc.scope);

	//show only last 2 autocompletes
	if ($("#output .autocomplete").length === 2) {
		$("#output .autocomplete").first().parent().remove();
	}

	$("#output").append($content);

	positioning(true);
};

var clearOutput = function() {
	ServerEval.clear();
	$("#output .result").remove();
};

var watchUpdater = function(watch) {
	return function() {
		ServerEval.eval(watch.expr, {
			'package': watch.watch_scope,
			watch: true
		});
	};
};

var toggleWatch = function(reopen) {
	if (watch_view_toggling) return;
	watch_view_toggling = true;

	if (!hiddenWatch) {
		$('#watch_view').hide();

		setWidth(true, function() {
			hiddenWatch = true;
			watch_view_toggling = false;

			if (reopen && $('#watch_view .watch').length > 0) {
				toggleWatch();
			}
		});
	} else {
		setWidth(false, function() {
			$('#watch_view').show();
			hiddenWatch = false;
			watch_view_toggling = false;
		});
	}
};

var internalCommand = function(cmd) {
	var $package_scope = $('#input_info span');
	if (cmd === ".clear") {
		clearOutput();
		positioning(true);
		return true;
	} else if (cmd.match(/se:use=.*/)) /* e.g. se:use=custom-package */ {
		package_scope = cmd.split("=")[1];
		$package_scope.html(package_scope);
		$package_scope.show();
		return true;
	} else if (cmd.match(/se:set-port=\d*/)) /* e.g. se:port=4000 */ {
		var port = cmd.split("=")[1];
		renderInternalMessage({
			txt: 'changed port to [PORT: ' + port + ']',
			type: "MSG"
		});
		ServerEval.changeServer(port);
		return true;
	} else if (cmd.match(/se:port\d*/)) {
		renderInternalMessage({
			txt: '[PORT: ' + ServerEval.currentPort() + ']',
			type: 'MSG'
		});
		return true;
	} else if (cmd.match(/se:reset/)) {
		$package_scope.hide();
		package_scope = null;
		return true;
	} else if (cmd.match(/se:watch=/)) /* e.g. se:new-watch=Date.now() */ {
		var watch_expr = cmd.split("=")[1];
		if (watch_expr) {
			watchUpdater({
				expr: watch_expr,
				watch_scope: package_scope
			})();
			newExpression(cmd);
		}
		return true;
	} else if (cmd.match(/se:watch-view/)) {
		var width = +cmd.substr(13);
		if (isNaN(width)) return true;

		var width_old = WATCH_WIDTH;
		if (width === 0) {
			WATCH_WIDTH = 30;
		} else {
			WATCH_WIDTH = width;
		}

		if (width === 0 || WATCH_WIDTH === width_old || hiddenWatch) {
			toggleWatch();
		} else if (WATCH_WIDTH !== width_old) {
			setWidth();
		}
		return true;
	}
	return false;
};

//console handler, handles: up, down, enter and ctrl + space
var consoleHandler = function(evt) {
	var eval_str = $("#run_eval").val();
	if (evt.keyCode == 13) /* enter */ {
		if (!internalCommand(eval_str)) {
			ServerEval.eval(eval_str, {
				'package': package_scope
			});
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
	} else if (evt.ctrlKey && evt.keyCode === 32) {
		show_autocomplete = true;
		eval_str = eval_str || '';
		var dotIdx = eval_str.lastIndexOf('.');
		var search;
		if (!eval_str) {
			eval_str = 'this';
		} else {
			if (dotIdx === -1) {
				eval_str = 'this.' + eval_str;
				dotIdx = 4;
			}
			search = eval_str.substr(dotIdx);
			eval_str = eval_str.substring(0, dotIdx);
		}

		ServerEval.eval(eval_str, {
			'package': package_scope,
			autocomplete: true,
			search: search && search.length > 1 ? search.substr(1) : undefined
		});
	}
};

var setupAutocomplete = function(supported_packages) {
	//use server-eval metadata to show supported packages
	var packageTags = _.map(supported_packages || [], function(pkg) {
		return "se:use=" + pkg;
	});

	var internalCommands = [
		":set-port=",
		":set-port=3000",
		":port",
		":reset",
		":watch=",
		":watch-view",
		":watch-view60",
		":use="
	];
	internalCommands = internalCommands.concat(packageTags);

	var generalCommands = [
		".clear"
	];

	$("#run_eval").autocomplete({
		position: {
			my: "left bottom",
			at: "left top",
			collision: "flip"
		},
		//minLength: 3,
		source: function(request, response) {
			//only allow matches starting with the input value
			var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex(request.term), "i");
			var tags = [];
			if (request.term.match(/^:/)) {
				tags = internalCommands;
			} else if (request.term.match(/^\./)) {
				tags = generalCommands;
			}

			response($.grep(tags, function(item) {
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
			}, 400);
		}
	});
};

$(document).ready(function() {
	//wire and initialize ui
	$("#run_eval").bind('keyup', consoleHandler);
	setupAutocomplete();

	var scrollTimeout;
	$(window).bind("scroll", function() {
		clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(function() {
			positioning();
		}, 100);
	});

	var resizeTimeout;
	$(window).resize(function() {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(function() {
			if (!hiddenWatch) {
				setWidth();
			}
		}, 100);
	});

	//listen to server eval events
	ServerEval.listenForServerState(function(evt) {
		renderInternalMessage({
			txt: evt.state_txt,
			type: evt.state_type
		});

		if (evt.state_type === "SUCCESS") {
			//remove old watches and close watch view with reopen true
			//(if there are watches getting added while closing)
			$('#watch_view .watch').remove();
			if (!hiddenWatch) {
				toggleWatch(true);
			}
		}
	});

	ServerEval.listenForMetadata(function(evt) {
		setupAutocomplete(evt.supported_packages);
	});

	ServerEval.listenForWatchUpdates(function(evt) {
		var watch = evt.watch_result;
		watch.update = watchUpdater(watch);
		watches[watch._id] = watch;

		renderWatch(watch);
	});

	ServerEval.listenForWatchRemoved(function(evt) {
		$('#' + evt.watch_id).remove();
		if ($('#watch_view .watch').length === 0) {
			toggleWatch();
		}
	});

	var completeInputValue = function(value) {
		var input_value = $("#run_eval").val();
		var dotIdx = input_value.lastIndexOf('.');
		if (dotIdx >= 0) {
			input_value = input_value.substring(0, dotIdx + 1) + value;
		} else {
			input_value = value;
		}
		$("#run_eval").val(input_value);
	};

	ServerEval.listenForNewResults(function(evt) {
		var _call = evt.result_doc && evt.result_doc.expr && newExpression(evt.result_doc.expr);

		//prevent to show autocompletes on reload
		if (evt.result_doc.autocomplete && show_autocomplete) {
			if (evt.result_doc.result.length === 1) {
				var first_completion = evt.result_doc.result[0];
				completeInputValue(first_completion);
			} else if (evt.result_doc.result.length > 1) {
				var completions = evt.result_doc.result;
				var mutual_part = "";

				var is_mutual_char = function(idx) {
					var isInAll = true;
					var _char = completions[0].charAt(idx);
					for (var i = 0; i < completions.length; i++) {
						var charAtIdx = completions[i].charAt(idx);
						if (charAtIdx !== _char) {
							isInAll = false;
						}
					}
					if (isInAll) {
						mutual_part += _char;
						return true;
					}
					return false;
				};

				//determine mutual part of all properties and add to input
				var min_length = -1;
				for (var j = 0; j < completions.length; j++) {
					var charLen = completions[j].length;
					if (min_length < 0 || min_length > charLen) {
						min_length = charLen;
					}
				}

				for (var n = 0; n < min_length; n++) {
					if (!is_mutual_char(n)) break;
				}

				completeInputValue(mutual_part);

				renderAutocomplete(evt.result_doc);
			}
		} else if (!evt.result_doc.autocomplete) {
			//console.time("render-result-time");
			renderResult(evt.result_doc);
			//console.timeEnd("render-result-time");
		}
	});

	ServerEval.init();
});