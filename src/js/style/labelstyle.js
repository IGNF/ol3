var ol = ol || {};
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

/** 
 * olx.style.LabelOptions
 * font {string} font in pixel size
 * label {string} label to display
 * stroke {ol.style.Stroke} Label rectangle border
 * Fill: {ol.style.Fill} rectangle background color
 * textColor {string} color of text
 * offsetX {Number} Horizontal offset in pixels. Default is 0.
 * offsetY {Number} Vertical offset in pixels. Default is 0.
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
ol.style.Label = function(opt_options) 
{	
	options = opt_options || {};
	
	ol.style.RegularShape.call (this, {
		radius: 2, 
		points: 4,
		fill: options.fill
	});
	
	this.render_(options);
};
ol.inherits(ol.style.Label, ol.style.RegularShape);

/**
 * Render the rectangle with label
 * @private
 */
ol.style.Label.prototype.render_ = function(options) 
{	
	var margin 	= options.margin || 5;
	var offsetX = options.offsetX || 0;
	var offsetY = options.offsetY || 0;
	
	var font 		= options.font || '10px sans-serif';
	var fillColor 	= options.fill ? ol.color.asString(options.fill.getColor()) : 'rgba(0,0,0,0.5)';
	var strokeColor = options.stroke ? ol.color.asString(options.stroke.getColor()) : '#fff';
	var strokeWidth = options.stroke ? options.stroke.getWidth() : 0;
	var textColor	= options.textColor || '#fff';
	
	canvas = this.getImage();
	var ctx = canvas.getContext('2d');

	ctx.font = font;
	var w = Math.round (ctx.measureText(options.label).width) + 2 * (margin + strokeWidth);
	var h = Number (ctx.font.match(/\d+(\.\d+)?/g).join([])); /*Math.round  ( ctx.measureText("M").width );*/
	h += 2 * (margin + strokeWidth);
	
	canvas.width 	= w;
	canvas.height 	= h;
	var s = this.getSize();
	s[0] = canvas.width;
	s[1] = canvas.height;
	
	ctx.font 		= font;
	ctx.fillStyle 	= fillColor;
	ctx.strokeStyle = strokeColor;
	ctx.lineWidth 	= strokeWidth;
	ctx.lineJoin 	= "round";
	/*ctx.roundRect(0, 0, canvas.width, canvas.height, 10);
	ctx.fill();
	ctx.stroke();*/
	ctx.strokeRect(strokeWidth, strokeWidth, canvas.width-2*strokeWidth,  canvas.height-2*strokeWidth);
	ctx.fillRect(strokeWidth, strokeWidth, canvas.width-2*strokeWidth,  canvas.height-2*strokeWidth);
	
	ctx.textAlign 		= 'center';
	ctx.textBaseline 	= 'middle';
	ctx.fillStyle 			= textColor;
	ctx.fillText (options.label, canvas.width/2, canvas.height/2);
	
	// Set anchor
	var a = this.getAnchor();
	a[0] = canvas.width/2 - offsetX;
	a[1] = canvas.height/2 - offsetY;
};