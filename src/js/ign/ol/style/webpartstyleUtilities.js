import { Stroke, Fill, Text, Circle, Icon, RegularShape } from 'ol/style';
import { asArray } from 'ol/color';
import { default as FillPattern } from 'ol-ext-4.0.4/style/FillPattern';

class WebpartStyleUtilities
{
	/** Format string with pattern ${attr}
	 *	@param {String} pattern
	 *	@param {ol.Feature} feature width properties
	 */
	formatProperties(format, feature)	{	
		if (!format || !format.replace || !feature) return format;
		let str = format.replace(/.*\$\{([^\}]*)\}.*/, "$1");
		if (str === format) {
			return format;
		} else {
			return this.formatProperties(format.replace("${" + str +"}", feature.get(str) || ''), feature);
		}
	}
	
	/** Format Style with pattern ${attr}
	 *	@param {style}
	 *	@param {ol.Feature} feature width properties
	 */
	formatFeatureStyle(fstyle, feature)	{
		if (!fstyle) return {};
		
		let fs = {};
		for (let i in fstyle) {
			fs[i] = this.formatProperties (fstyle[i], feature)
		}
		return fs;
	}
	
	/** Get stroke LineDash style from featureType.style
	 * @param {style}
	 * @return Array
	 */
	getStrokeLineDash(style) {
		let width = Number(style.strokeWidth) || 2;
		switch (style.strokeDashstyle) {
			case 'dot': return [1,2*width];
			case 'dash': return [2*width,2*width];
			case 'dashdot': return [2*width, 4*width, 1, 4*width];
			case 'longdash': return [4*width,2*width];
			case 'longdashdot': return [4*width, 4*width, 1, 4*width];
			default: return undefined;
		}
	}

	/** Get stroke style from featureType.style
	 *	@param {featureType.style | {color,width} | undefined}
	 *	@return Stroke
	 */
	getStroke = function (fstyle) {
		if (fstyle.strokeOpacity === 0) return;
		
		let stroke = new Stroke({
			color: fstyle.strokeColor || "#00f",
			width: Number(fstyle.strokeWidth) || 1,
			lineDash: this.getStrokeLineDash(fstyle),
			lineCap: fstyle.strokeLinecap || "round"
		});
		if (fstyle.strokeOpacity < 1)	{
			var a = asArray(stroke.getColor());
			if (a.length){
				a[4] = fstyle.strokeOpacity;
				stroke.setColor(a);
			}
		}
		return stroke;
	}

	/** Get stroke border style from featureType.style
	 *	@param {featureType.style | {color,width} | undefined}
	 *	@return Stroke
	 */
	getStrokeBorder = function (fstyle)	{	
		if (fstyle.strokeOpacity === 0) return;
		
		let stroke = new Stroke({
			color: fstyle.strokeBorderColor || "#000",
			width: (Number(fstyle.strokeWidth) || 1) + 3,
			lineDash: this.getStrokeLineDash(fstyle),
			lineCap: fstyle.strokeLinecap || "round"
		});
		if (fstyle.strokeOpacity < 1){
			var a = asArray(stroke.getColor());
			if (a.length){
				a[4] = fstyle.strokeOpacity;
				stroke.setColor(a);
			}
		}
		return stroke;
	}

	/** Get fill style from featureType.style
	 *	@param {featureType.style | undefined}
	 *	@return Fill
	 */
	getFill = function (fstyle) {	
		if (fstyle.fillOpacity === 0) return;
		
		let fill = new Fill({
			color: fstyle.fillColor || "rgba(255,255,255,0.5)",
		});
		if (fstyle.fillOpacity < 1)	{
			let a = asArray(fill.getColor());
			if (a.length)	{
				a[3] = Number(fstyle.fillOpacity);
				fill.setColor(a);
			}
		}
		
		if (! fstyle.fillPattern) return fill;

		return new FillPattern({
			fill: fill,
			pattern: fstyle.fillPattern,
			color: fstyle.patternColor,
			angle: 45
		});
	}
	
	/** Get Image style from featureType.style
	 *	@param {featureType.style |  undefined}
	 *	@return ol.style.Image
	 */
	getImage(fstyle)	{
		let image;	
		
		// externalGraphic
		if (fstyle.externalGraphic) {
			// Gestion d'une bibliotheque de symboles
			src = urlImgAlone + "./../" + fstyle.externalGraphic ;

			if (fstyle.graphicWidth && fstyle.graphicHeight) {
				// src += "?width="+fstyle.graphicWidth+"&height="+fstyle.graphicHeight;
				src += `?width=${fstyle.graphicWidth}&height=${fstyle.graphicHeight}`;
			}

			let image = new Icon({
				scale: 1,
				src: src,
				opacity: fstyle.graphicOpacity,
				rotation:Number(fstyle.rotation)* (2 * Math.PI  / 180) || 0,
				//permet de centrer le picto
				offset: [0.5, 0.5],
				anchor: [0.5, 0.5],
				anchorXUnits: 'fraction',
				anchorYUnits: 'fraction'
			});
			image.load();
			return image;
		}
		
		let radius = Number(fstyle.pointRadius) || 5;
		switch (fstyle.graphicName)	{
			case "cross":
			case "star":
			case "square":
			case "triangle":
			case "x":
				let graphic = {
					cross: [ 4, radius, 0, 0 ],
					square: [ 4, radius, undefined, Math.PI/4 ],
					triangle: [ 3, radius, undefined, 0 ],
					star: [ 5, radius, radius/2, 0 ],
					x: [ 4, radius, 0, Math.PI/4 ]
				};
				let g = graphic[fstyle.graphicName] || graphic.square;
				image = new RegularShape({
					points: g[0],
					radius: g[1],
					radius2: g[2],
					rotation: g[3],
					stroke: this.getStroke(fstyle),
					fill: this.getFill(fstyle)
				});
				break;
			default:
				image = new Circle({
					radius: radius,
					stroke: this.getStroke(fstyle),
					fill: this.getFill(fstyle)
				});
				break;
		}

		return image;
	}
	
	/** Get Text style from featureType.style
	 *	@param {featureType.style | undefined}
	 *	@return ol.style.Text
	 */
	getText(fstyle) {
		if (fstyle.label === null) return undefined;
		
		let s = {
			font: (fstyle.fontWeight || '')
				+ " "
				+ (fstyle.fontSize || "12") +'px'
				+ " "
				+ (fstyle.fontFamily || 'Sans-serif'),
			text: fstyle.label,
			rotation: (fstyle.labelRotation || 0),
			textAlign: "left",
			textBaseline: "middle",
			offsetX: fstyle.labelXOffset||0,
			offsetY: -fstyle.labelYOffset||0,
			stroke: new Stroke({
				color: fstyle.labelOutlineColor || "#fff",
				width: Number(fstyle.labelOutlineWidth) || 2
			}),
			fill: new Fill({
				color: fstyle.fontColor
			})
		};
		return new Text(s);
	}
}

export default WebpartStyleUtilities;