//scrolls the page to the bottom, 
var jumpToPageBottom = function() {
  $('html, body').scrollTop($(document).height() - $(window).height());
};

//check for type and wrap string in quotation marks
var wrapPrimitives = function(value) {
  return _.isString(value) ?
    '<span class="string_value">"' + value + '"</span>' :
    value;
};