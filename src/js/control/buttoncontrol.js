/*	Copyright (c) 2016 Jean-Marc VIGLINO, 
	released under the CeCILL-B license (French BSD license)
	(http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/
/** A simple push button control 
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object=} opt_options Control options.
 *      name {String} name of the control
 *		className {String} class of the control
 *		title {String} title of the control
 *		html {String} html to insert in the control
 *		handleClick {function} callback when control is clicked (or use change:active event)
 */
ol.control.Button = function(options) 
{	options = options || {};
	var element = $("<div>").addClass((options.className||"") + ' ol-button ol-unselectable ol-control');
	var self = this;

	this.button_ = $("<button>");
	this.button_.html(options.html || "")
		.attr('title', options.title)
		.on("touchstart click", function(e)
		{	if (e && e.preventDefault) 
			{	e.preventDefault();
				e.stopPropagation();
			}
			if (options.handleClick) options.handleClick.call(self, e);
		})
		.appendTo(element);
	
	ol.control.Control.call(this, 
	{	element: element.get(0),
		target: options.target
	});
	
	this.set('name',options.name || ""); 
};
ol.inherits(ol.control.Button, ol.control.Control);

/** Set the control visibility
* @param {boolean} b 
*/
ol.control.Button.prototype.setVisible = function (val) {
	if (val) $(this.element).show();
	else $(this.element).hide();
}

/**
 * Set the button title
 * @param {string} title
 * @returns {undefined}
 */
ol.control.Button.prototype.setTitle = function(title)
{
    this.button_.attr('title', title);
};

/**
 * Set the button html
 * @param {string} html
 * @returns {undefined}
 */
ol.control.Button.prototype.setHtml = function(html)
{
    this.button_.html(html);
};

/** A simple push button control drawn as text
*/
ol.control.TextButton = function(options) 
{	options = options || {};
	options.className = (options.className||"") + " ol-text-button";
	ol.control.Button.call(this, options);
};
ol.inherits(ol.control.TextButton, ol.control.Button);
