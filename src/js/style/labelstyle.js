import { asString } from 'ol/color';
import RegularShape from 'ol/style/RegularShape';

/* 
 * font {string} font
 * label {string} text
 */
export function ign_utils_getMeasureText(font, text) {
	let canvas = document.createElement('CANVAS');
	let  ctx = canvas.getContext('2d');
	
	ctx.font = font;
	let w = ctx.measureText(text).width;
	canvas = null;
	
	return Math.round(w);
};

/**
 * @classdesc
 * Set Label style for vector features.
 *
 * @constructor
 * @param {olx.style.LabelOptions=} Options.
 * @extends {ol.style.RegularShape}
 * 
 * opt_options
 *      - font {string} font in pixel size 
 *      - label {string} label to display
 *      - stroke {ol.style.Stroke} text border color
 *      - fill {ol.style.Fill} text color
 *      - rotation {Number} Rotation
 *      - margin
 *      - offsetX {Number} Horizontal offset in pixels. Default is 0.
 *      - offsetY {Number} Vertical offset in pixels. Default is 0.
 * rect_options
 *      - stroke    {ol.style.Stroke} rectangle stroke color
 *      - fill      {ol.style.Fill} rectangle background color
 * 
 */
class ol_style_Label extends RegularShape
{
	constructor(opt_options, rect_options) {
		let options = opt_options ?? {};
		let rectOptions = rect_options ?? {};
	
		super({ radius: 1, rotation: options.rotation || 0 });
		this._drawLabel(options, rectOptions);	
	}

	/**
	 * Render the rectangle with label
	 * @private
	 */
	_drawLabel(options, rectOptions) {
		let margin  = options.margin || 5;
		let offsetX = options.offsetX || 0;
		let offsetY = options.offsetY || 0;
		
		// Rectangle
		let fillColor 	= rectOptions.fill ? asString(rectOptions.fill.getColor()) : 'rgba(0,0,0,0.5)';
		let strokeColor = rectOptions.stroke ? asString(rectOptions.stroke.getColor()) : '#fff';
		let strokeWidth = rectOptions.stroke ? rectOptions.stroke.getWidth() : 0;
	
		// Text
		let font 			= options.font || '10px sans-serif';
		let strokeTextWidth = options.stroke ? options.stroke.getWidth() : 0;
		let strokeTextColor	= options.stroke ? asString(options.stroke.getColor()) : '#fff';
		let fillTextColor	= options.fill ? asString(options.fill.getColor()) : '#fff';
		
		let canvas = this.getImage();
		let ctx = canvas.getContext('2d');
	
		ctx.font = font;
		let textWidth = Math.round (ctx.measureText(options.label).width) + 2 * strokeTextWidth;
		
		let w = textWidth+ 2 * (margin + strokeWidth);
		let h = Number (ctx.font.match(/\d+(\.\d+)?/g).join([])) + 2 * strokeTextWidth;/*Math.round  ( ctx.measureText("M").width );*/
		h += 2 * (margin + strokeWidth);
		
		canvas.width 	= w;
		canvas.height 	= h;
		let s = this.getSize();
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
		let a = this.getAnchor();
		a[0] = canvas.width/2 - offsetX;
		a[1] = canvas.height/2 - offsetY;	
	}
}

export default ol_style_Label;