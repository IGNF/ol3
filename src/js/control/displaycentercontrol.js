/* Copyright (c) 2016 P.Prevautel
    released under the CeCILL-B license (French BSD license)
    (http://www.cecill.info/licences/Licence_CeCILL-B_V1-en.txt).
*/

/** ol.control.DisplayCenter draw a target at the center of the map.
* @param
*  - color  {ol.Color or string} line color
*	- width {integer} line width  
*  - radius
*/
ol.control.DisplayCenter = function(options)
{    
	options = options || {};
    var self = this;

    this.style = options.style || new ol.style.Stroke({
		color: options.color || '#000', 
		width:options.width || 1
	});
    this.radius   	= options.radius;
   
    var div = document.createElement('div');
    div.className = "ol-target ol-unselectable ol-control";
    ol.control.Control.call(this,{
		element: div
    });
};

ol.inherits(ol.control.DisplayCenter, ol.control.Control);

/**
 * Remove the control from its current map and attach it to the new map.
 * Subclasses may set up event handlers to get notified about changes to
 * the map here.
 * @param {ol.Map} map Map.
 * @api stable
 */
ol.control.DisplayCenter.prototype.setMap = function (map)
{   
    ol.control.Control.prototype.setMap.call(this, map);
    if (this.getMap())	{
		this.getMap().un('postcompose', this.drawTarget_, this);
    }
	
    if (map) {    
		map.on('postcompose', this.drawTarget_, this);
    }
};

/** Draw the target
* @private
*/
ol.control.DisplayCenter.prototype.drawTarget_ = function (event)
{    
	if (! this.getMap()) return;
   
    var ctx		= event.context;
    var ratio   = event.frameState.pixelRatio;

    ctx.save();
    ctx.scale(ratio,ratio);
   
    var cx = ctx.canvas.width/(2*ratio);
    var cy = ctx.canvas.height/(2*ratio);
   
    ctx.lineWidth         = this.style.getWidth();
    ctx.strokeStyle     = ol.color.asString(this.style.getColor());   
           
    if (this.radius === undefined)    {
        ctx.beginPath();
        ctx.moveTo (cx, 0);
        ctx.lineTo (cx, ctx.canvas.height);
        ctx.moveTo (0, cy);
        ctx.lineTo( ctx.canvas.width, cy);
    } else {
        var m = this.radius;

        ctx.beginPath();
        ctx.moveTo (cx-m, cy);
        ctx.lineTo (cx+m, cy);
        ctx.moveTo (cx, cy-m);
        ctx.lineTo( cx, cy+m);
    }
   
    ctx.stroke();
    ctx.restore();
};