var escapeHtml = function(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

//check for type and wrap string in quotation marks
var wrapPrimitives = function(value) {
  if (_.isString(value)) {
    var html = ansiConvert.toHtml(escapeHtml(value));
    return '<span class="string_value preserve-whitespace">"' + html + '"</span>';
  } else {
    return String(value);
  }
};