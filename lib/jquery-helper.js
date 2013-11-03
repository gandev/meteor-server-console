$.fn.getRealDimensions = function(outer) {
	var $this = $(this);
	if ($this.length === 0) {
		return false;
	}
	var $clone = $this.clone()
		.show()
		.css('visibility', 'hidden')
		.appendTo('body');
	var result = {
		width: (outer) ? $clone.outerWidth() : $clone.innerWidth(),
		height: (outer) ? $clone.outerHeight() : $clone.innerHeight(),
		offsetTop: $clone.offset().top,
		offsetLeft: $clone.offset().left
	};
	$clone.remove();
	return result;
};

//scrolls the page to the bottom, 
var jumpToPageBottom = function() {
	$('html, body').scrollTop($(document).height() - $(window).height());
};