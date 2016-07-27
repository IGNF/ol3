ol.utils = ol.utils || {};

/* 
 * font {string} font
 * label {string} text
 */
ol.utils.getMeasureText = function(font, text)	{
	var canvas = document.createElement('CANVAS');
	var ctx = canvas.getContext('2d');
	ctx.font = font;
	var w = ctx.measureText(text).width;
	delete canvas;
	
	return Math.round(w);
};

/** olx.style.LabelOptions
 * font {string} font in pixel size
 * label {string} label to display
 * stroke {ol.style.Stroke} text border color
 * Fill: {ol.style.Fill} text color
 * offsetX {Number} Horizontal offset in pixels. Default is 0.
 * offsetY {Number} Vertical offset in pixels. Default is 0.
 *
 * Rectangle options
 * stroke {ol.style.Stroke} rectangle stroke color
 * Fill: {ol.style.Fill} rectangle background color
 */
/**
 * @classdesc
 * Set Label style for vector features.
 *
 * @constructor
 * @param {olx.style.LabelOptions=} Options.
 * @extends {ol.style.RegularShape}
 * @api
 */
ol.style.Label = function(opt_options, rect_options) 
{	
	var options         = opt_options || {};
	var rect_options 	= rect_options || {};
	
	ol.style.RegularShape.call(this,{radius: 2});
	this.drawLabel_(options, rect_options);
};

ol.inherits(ol.style.Label, ol.style.RegularShape);

/**
 * Render the rectangle with label
 * @private
 */
ol.style.Label.prototype.drawLabel_ = function(options, rect_options) 
{	
	var margin  = options.margin || 5;
	var offsetX = options.offsetX || 0;
	var offsetY = options.offsetY || 0;
	
	// Rectangle
	var fillColor 	= rect_options.fill ? ol.color.asString(rect_options.fill.getColor()) : 'rgba(0,0,0,0.5)';
	var strokeColor = rect_options.stroke ? ol.color.asString(rect_options.stroke.getColor()) : '#fff';
	var strokeWidth = rect_options.stroke ? rect_options.stroke.getWidth() : 0;

	// Text
	var font 			= options.font || '10px sans-serif';
	var strokeTextWidth = options.stroke ? options.stroke.getWidth() : 0;
	var strokeTextColor	= options.stroke ? ol.color.asString(options.stroke.getColor()) : '#fff';
	var fillTextColor	= options.fill ? ol.color.asString(options.fill.getColor()) : '#fff';
	
	canvas = this.getImage();
	var ctx = canvas.getContext('2d');

	ctx.font = font;
	var textWidth = Math.round (ctx.measureText(options.label).width) + 2 * strokeTextWidth;
	
	var w = textWidth+ 2 * (margin + strokeWidth);
	var h = Number (ctx.font.match(/\d+(\.\d+)?/g).join([])) + 2 * strokeTextWidth;/*Math.round  ( ctx.measureText("M").width );*/
	h += 2 * (margin + strokeWidth);
	
	canvas.width 	= w;
	canvas.height 	= h;
	var s = this.getSize();
	s[0] = canvas.width;
	s[1] = canvas.height;
	
	// Draw rectangle
	ctx.font 		= font;
	ctx.fillStyle 	= fillColor;
	ctx.strokeStyle = strokeColor;
	ctx.lineWidth 	= strokeWidth;
	ctx.lineJoin 	= "round";
	
	ctx.strokeRect(strokeWidth, strokeWidth, canvas.width-2*strokeWidth,  canvas.height-2*strokeWidth);
	ctx.fillRect(strokeWidth, strokeWidth, canvas.width-2*strokeWidth,  canvas.height-2*strokeWidth);
	
	// Draw text
	ctx.textAlign 	 = 'center';
	ctx.textBaseline = 'middle';
	
	if (strokeTextWidth > 0)	{
		ctx.strokeStyle = strokeTextColor;
		ctx.lineWidth	= strokeTextWidth;
		ctx.strokeText (options.label, canvas.width/2, canvas.height/2);
	}
	
	ctx.fillStyle = fillTextColor;
	ctx.fillText (options.label, canvas.width/2, canvas.height/2);
	
	// Set anchor
	var a = this.getAnchor();
	a[0] = canvas.width/2 - offsetX;
	a[1] = canvas.height/2 - offsetY;
};