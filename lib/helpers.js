//scrolls the page to the bottom, 
var jumpToPageBottom = function() {
  $('html, body').scrollTop($(document).height() - $(window).height());
};

//check for type and wrap string in quotation marks
var wrapPrimitives = function(value) {
  if (_.isString(value)) {
    return '<span class="string_value">"' + value + '"</span>';
  } else if (_.isNull(value)) {
    return "null";
  } else if (value) {
    return value;
  } else {
    return "undefined";
  }
};