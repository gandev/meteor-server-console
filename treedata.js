//converting object data in http://mbraak.github.io/jqTree/ format
//----------------------------------------------------------------

//return formatted html string with result type name and color style
//server-eval smartpackage adds custom property:
//  ____TYPE____ for special objects (e.g. Error, Function, ...) 
var _typeHtml = function(value) {
	var type = "unknown";
	var type_style = 'style="white-space: pre; color: ';
	if (value.____TYPE____) {
		type = value.____TYPE____;
		if (type === "[Circular]") {
			type += "[" + value.path + "]";
			type_style += 'red;"';
		} else if (type.indexOf("[Object]") >= 0) {
			type_style += 'green;"';
		} else if (type === "[Error]") {
			type += "[" + value.err + "]";
			type_style += 'red;"';
		} else if (type === "[Function]") {
			type_style += 'blue;"';
		} else if (type === '[Tinytest]') {
			type += '[<a href="http://' +
				ServerEval.currentHost() + ':' + value.port + '" ' +
				'target="_blank">open..</a>]';
			type_style += 'brown;"';
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

//converts error objects in jqtree format
var _errorToTreeData = function(obj) {
	var tree_data = [];
	var belowEval = false;
	var stacktrace = _.map(obj.stack || [], function(value, key, list) {
		value = value.replace(/\s*at\s*/, '');
		var call = value.replace(/\s+/, "|").split("|");
		var location = (call.length === 2 ? call[1] : call[0]);
		var method = (call.length === 2 ? call[0] : 'anonymous');

		if (method === "eval") {
			belowEval = true;
			return undefined; //remove the eval call
		}

		var special = "";
		if (!belowEval) {
			//above the eval call itself is most likely the important stuff
			special = "important";
		} else if (location.indexOf("server-eval") >= 0 || method.indexOf("__serverEval") >= 0) {
			//internal server-eval overhead
			special = "internal";
		}

		var error_method = '<span class="error_method ' + special + '">' +
			method + '</span>';
		var error_location = '<span class="error_location ' + special + '">' +
			location + '</span>';
		return {
			'label': error_method + error_location
		};
	});
	stacktrace = _.compact(stacktrace);
	tree_data.push({
		'label': _typeHtml(obj),
		'children': stacktrace
	});
	return tree_data;
};

var _createSubtree = function(label, children) {
	return {
		'label': label,
		'children': children
	};
};

var formatByteSize = function(bytes) {
	bytes = parseInt(bytes, 10);
	var bytes_formatted;
	if (isNaN(bytes) || bytes === 0) {
		return '';
	} else if (bytes < 1024) {
		bytes_formatted = bytes + "byte";
	} else if (bytes < 1048576) {
		bytes_formatted = (bytes / 1024).toFixed(2) + "kb";
	} else {
		floatNum = bytes / 1048576;
		bytes_formatted = floatNum.toFixed(2) + "mb";
	}
	return '<span style="font-size: 0.6em;">' + bytes_formatted + ' est.</span>';
};

//converts all kind of result objects in jqtree format
//recursive function adding subtrees, subtree subtrees, ...
var objectToTreeData = function(obj_raw, top_level) {
	var obj = obj_raw._id && obj_raw.result ? obj_raw.result /* special object from server-eval */ : obj_raw;

	if (!_.isObject(obj)) return [];

	var tree_data = [];
	var isError = obj.____TYPE____ === "[Error]";
	var isCircular = obj.____TYPE____ === "[Circular]";

	if (isError) {
		if (obj.size_error) {
			obj.err = obj.err.replace(/IGNORE/, '<a class="ignore_size" id="' + obj_raw._id + '">ignore..</a>');
		}
		return _errorToTreeData(obj);
	}

	for (var key in obj) {
		var value = obj[key];
		//dont show special result type and circular path property in tree
		if (key === "____TYPE____" || isCircular && key === "path") {
			continue;
		}

		var sub_tree;
		if (_.isObject(value)) {
			//sub_tree with children (objects)
			sub_tree = _createSubtree(key + ": " + _typeHtml(value), objectToTreeData(value, false));
		} else {
			//sub_tree without children (string, number, boolean)
			sub_tree = _createSubtree(key + ": " + wrapPrimitives(value));
		}

		//top level label is just the _typeHtml and properties are direct children
		if (top_level) {
			if (tree_data.length === 0) {
				tree_data.push(_createSubtree(_typeHtml(obj) + formatByteSize(obj_raw.size), []));
			}
			tree_data[0].children.push(sub_tree);
		} else {
			tree_data.push(sub_tree);
		}
	}

	if (top_level && tree_data.length === 0) {
		tree_data.push(_createSubtree(_typeHtml(obj)));
	}

	return tree_data;
};