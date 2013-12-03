function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

//check for type and wrap string in quotation marks
var wrapPrimitives = function(value) {
  if (_.isString(value)) {
    return '<span class="string_value" style="white-space: pre;">"' + escapeHtml(value) + '"</span>';
  } else if (_.isNull(value)) {
    return "null";
  } else if (value === false || value === 0 || value) {
    return value;
  } else {
    return "undefined";
  }
};