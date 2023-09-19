/**
* @namespace ol.layer.Vector.Webpart.Style
*/
ol.layer.Vector.Webpart.Style = {};

/** Format string with pattern ${attr}
*	@param {String} pattern
*	@param {ol.Feature} feature width properties
*/
ol.layer.Vector.Webpart.Style.formatProperties = function (format, feature)
{	if (!format || !format.replace || !feature) return format;
    var i = format.replace(/.*\$\{([^\}]*)\}.*/, "$1");
    if (i === format) {
        return format;
    } else {
        return ol.layer.Vector.Webpart.Style.formatProperties(format.replace("${"+i+"}", feature.get(i)||''), feature);
    }
};

/** Format Style with pattern ${attr}
*	@param {style}
*	@param {ol.Feature} feature width properties
*/
ol.layer.Vector.Webpart.Style.formatFeatureStyle = function (fstyle, feature){
    if (!fstyle) return {};
    var fs = {};
    for (var i in fstyle) {
        fs[i] = ol.layer.Vector.Webpart.Style.formatProperties (fstyle[i], feature)
    }
    return fs;
};

/** Get stroke LineDash style from featureType.style
 * @param {style}
 * @return Array
 */
ol.layer.Vector.Webpart.Style.StrokeLineDash = function (style) {
    var width = Number(style.strokeWidth) || 2;
    switch (style.strokeDashstyle) {
        case 'dot': return [1,2*width];
        case 'dash': return [2*width,2*width];
        case 'dashdot': return [2*width, 4*width, 1, 4*width];
        case 'longdash': return [4*width,2*width];
        case 'longdashdot': return [4*width, 4*width, 1, 4*width];
        default: return undefined;
    }
};

/** Get stroke style from featureType.style
*	@param {featureType.style | {color,width} | undefined}
*	@return ol.style.Stroke
*/
ol.layer.Vector.Webpart.Style.Stroke = function (fstyle) {
    if (fstyle.strokeOpacity===0) return;
    var stroke = new ol.style.Stroke({
        color: fstyle.strokeColor || "#00f",
        width: Number(fstyle.strokeWidth) || 1,
        lineDash: ol.layer.Vector.Webpart.Style.StrokeLineDash(fstyle),
        lineCap: fstyle.strokeLinecap || "round"
    });
    if (fstyle.strokeOpacity<1){
        var a = ol.color.asArray(stroke.getColor());
        if (a.length){
            a[4] = fstyle.strokeOpacity;
            stroke.setColor(a);
        }
    }
    return stroke;
}

/** Get stroke border style from featureType.style
*	@param {featureType.style | {color,width} | undefined}
*	@return ol.style.Stroke
*/
ol.layer.Vector.Webpart.Style.StrokeBorder = function (fstyle)
{	if (fstyle.strokeOpacity===0) return;
    var stroke = new ol.style.Stroke({
        color: fstyle.strokeBorderColor || "#000",
        width: (Number(fstyle.strokeWidth) || 1) + 3,
        lineDash: ol.layer.Vector.Webpart.Style.StrokeLineDash(fstyle),
        lineCap: fstyle.strokeLinecap || "round"
    });
    if (fstyle.strokeOpacity<1){
        var a = ol.color.asArray(stroke.getColor());
        if (a.length){
            a[4] = fstyle.strokeOpacity;
            stroke.setColor(a);
        }
    }
    return stroke;
}

/** Get fill style from featureType.style
*	@param {featureType.style | undefined}
*	@return ol.style.Fill
*/
ol.layer.Vector.Webpart.Style.Fill = function (fstyle)
{	if (fstyle.fillOpacity===0) return;
    var fill = new ol.style.Fill({
        color: fstyle.fillColor || "rgba(255,255,255,0.5)",
    });
    if (fstyle.fillOpacity < 1)
    {	var a = ol.color.asArray(fill.getColor());
        if (a.length)
        {	a[3] = Number(fstyle.fillOpacity);
            fill.setColor(a);
        }
    }
    if (fstyle.fillPattern) {
        var fill = new ol.style.FillPattern({
            fill: fill,
            pattern: fstyle.fillPattern,
            color: fstyle.patternColor,
            angle: 45
        });

    }
    return fill;
}

/** Get Image style from featureType.style
*	@param {featureType.style |  undefined}
*	@return ol.style.Image
*/
ol.layer.Vector.Webpart.Style.Image = function (fstyle)
{	var image;
    //externalGraphic
    if (fstyle.externalGraphic) {
        // Gestion d'une bibliotheque de symboles
        src = urlImgAlone + "./../" + fstyle.externalGraphic ;

        if (fstyle.graphicWidth && fstyle.graphicHeight) {
            src += "?width="+fstyle.graphicWidth+"&height="+fstyle.graphicHeight;
        }

        image = new ol.style.Icon({
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
    } else {
        var radius = Number(fstyle.pointRadius) || 5;
        switch (fstyle.graphicName)
        {	case "cross":
            case "star":
            case "square":
            case "triangle":
            case "x":
                var graphic =
                    {	cross: [ 4, radius, 0, 0 ],
                        square: [ 4, radius, undefined, Math.PI/4 ],
                        triangle: [ 3, radius, undefined, 0 ],
                        star: [ 5, radius, radius/2, 0 ],
                        x: [ 4, radius, 0, Math.PI/4 ]
                    }
                var g = graphic[fstyle.graphicName] || graphic.square;
                image = new ol.style.RegularShape(
                    {	points: g[0],
                        radius: g[1],
                        radius2: g[2],
                        rotation: g[3],
                        stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle),
                        fill: ol.layer.Vector.Webpart.Style.Fill(fstyle)
                    });
                break;
            default:
                image = new ol.style.Circle(
                        {	radius: radius,
                            stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle),
                            fill: ol.layer.Vector.Webpart.Style.Fill(fstyle)
                        });
                break;
        }
    }

    return image;
};

/** Get Text style from featureType.style
*	@param {featureType.style | undefined}
*	@return ol.style.Text
*/
ol.layer.Vector.Webpart.Style.Text = function (fstyle) {
    if (fstyle.label===null) return undefined;
    var s = {
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
        stroke: new ol.style.Stroke({
            color: fstyle.labelOutlineColor || "#fff",
            width: Number(fstyle.labelOutlineWidth) || 2
        }),
        fill: new ol.style.Fill({
            color: fstyle.fontColor
        })
    };
    return new ol.style.Text(s);
};

ol.layer.Vector.Webpart.Style.cacheStyle = {};

/** Get ol.style.function as defined in featureType
* @param {featureType}
* @return { ol.style.function | undefined }
*/
ol.layer.Vector.Webpart.Style.getFeatureStyleFn = function(featureType) {
    // mongoParser
    var parser = window.mongoparser;
	
    // Sens de circulation
    var directionStyle = new ol.style.Style ({
        text: ol.layer.Vector.Webpart.Style.Text ({
            label: '\u203A',
            fontWeight: "bold",
            fontSize: '25'
        })
    });
    // Fonction de style
    if (!featureType) featureType = {};
    if (featureType.name && ol.layer.Vector.Webpart.Style[featureType.name])
    {	return ol.layer.Vector.Webpart.Style[featureType.name](featureType);
    }
    else return function(feature, res) {
        if (!feature) return [];
        var style = featureType.style
		
		let resUtils = new ol.utils.resolutions();
		
		let minZoom = 0;
        if (featureType.name) {
			minZoom = featureType.minZoomLevel;
        }
		
        // Conditionnal style
        if (featureType.style && featureType.style.children) {
            for (var i=0, fi; fi=featureType.style.children[i]; i++) {
                if (typeof (fi.condition) ==='string') {
                    try {
                        fi.condition = JSON.parse(fi.condition);
                    } catch(e) {}
                }
                // Copy les valeurs de feature
                var obj = Object.assign({}, feature.getProperties());
                // Enleve la geometry car trop long pour mongoparser
                delete obj[feature.geometryName_];
                if (parser.parse(fi.condition).matches(obj)) {
                    style = fi;
                    break;
                }
            }
        }

        var fstyle = ol.layer.Vector.Webpart.Style.formatFeatureStyle (style, feature);
					
		let displayText = true;
		if (fstyle.labelMinZoom !== null) {
			let zoom = Math.max(minZoom, fstyle.labelMinZoom);
			let resolution = resUtils.getResolution(zoom);
			displayText = (res <= resolution);
		}
			
        var cacheId = fstyle.name;
        for (var i in style) if (i !== 'label') {
            if (style[i] !== fstyle[i]) cacheId += '-' + i + ':' + fstyle[i];
        }
        var style = ol.layer.Vector.Webpart.Style.cacheStyle[cacheId];
        if (style) {
            var style = ol.layer.Vector.Webpart.Style.cacheStyle[cacheId];
            var textStyle = style[style.length-1].getText();
			
			let text = '';
			if (fstyle.label && displayText) text = fstyle.label;
            if (textStyle) textStyle.setText(text);
        } else {
			// L'etiquette
			let textStyleConfig = {
				text: ol.layer.Vector.Webpart.Style.Text (fstyle)
			};
			if (fstyle.label)	{
				/* Pour les multipolygones, on met le label sur le polygone dont
				la surface est la plus grande */
				if (feature.getGeometry().getType() === 'MultiPolygon') {
					textStyleConfig['geometry'] = function(feature) {
						var polygons = feature.getGeometry().getPolygons();
						polygons.sort(function (a, b) { return a.getArea()- b.getArea() });
						return polygons[polygons.length - 1].getInteriorPoint();
					};
				}
			}
				
			if (! displayText) { 
				textStyleConfig.text.setText('');
			}

			let textStyle = new ol.style.Style(textStyleConfig);
			var styleConfig = {
                image: ol.layer.Vector.Webpart.Style.Image (fstyle),
                fill: ol.layer.Vector.Webpart.Style.Fill (fstyle),
                stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle)
            };
			
			let st = [new ol.style.Style (styleConfig), textStyle];
			
            // If img don't load > draw circle
            if (fstyle.externalGraphic) {
                var img = st[0];
                img.getImage().getImage().onerror = function () {
                    img.setImage(ol.layer.Vector.Webpart.Style.Image({}));
                }
            }
            if (fstyle.strokeBorderColor) {
                st.unshift( new ol.style.Style ({
                    stroke: ol.layer.Vector.Webpart.Style.StrokeBorder(fstyle),
                    zIndex: -1
                }));
            }
            style = ol.layer.Vector.Webpart.Style.cacheStyle[cacheId] = st;
        }
		
        // Ajouter le sens de circulation
        let directionField;
        if (featureType.style && featureType.style.directionField) {
            try {
                directionField = JSON.parse(featureType.style.directionField);
            } catch (e) {
                directionField = null;
                console.log("bad json direction field for style " + featureType.style.name);
            }
        }
        
        if (res < 2 && directionField instanceof Object) {
			if ('attribute' in directionField && 'sensDirect' in directionField && 'sensInverse' in directionField) {
				let direct  = directionField.sensDirect;
				let inverse = directionField.sensInverse;
				
				function lrot(sens, geom)	{	
					if (sens != direct && sens != inverse) return 0;
					if (geom.getType()==='MultiLineString') geom = geom.getLineString(0);
					var geo = geom.getCoordinates();
					var x, y, dl=0, l = geom.getLength();
					for (var i=0; i<geo.length-1; i++){
						x = geo[i+1][0]-geo[i][0];
						y = geo[i+1][1]-geo[i][1];
						dl += Math.sqrt(x*x+y*y);
						if (dl>=l/2) break;
					}
					if (sens == direct) return -Math.atan2(y,x);
					else return Math.PI-Math.atan2(y,x);
				};
			
				let sens = feature.get(directionField.attribute);
				if (sens===direct || sens===inverse) {
					directionStyle.getText().setRotation(lrot(sens, feature.getGeometry()));
					style = style.concat([directionStyle]);
				}
			}
		}

        return style;
    }
};

/** Default style
 *	@return {ol.style.Style}
*/
ol.layer.Vector.Webpart.Style.Default = ol.layer.Vector.Webpart.Style.getFeatureStyleFn()()[0];

/** Objets mort-vivant
*/
ol.layer.Vector.Webpart.Style.zombie = function(zombieStyleColors)
{
    function getColor(feature, opacity)
    {	return ( feature.get(feature.getDetruitField()) ? (zombieStyleColors.dead).concat([opacity]) : (zombieStyleColors.alive).concat([opacity]) );
    };

    return function (feature, res)
    {	var fstyle = {
            strokeColor: getColor(feature, 1),
            strokeWidth: 2,
            fillColor: getColor(feature, 0.5)
        }
        return [
            new ol.style.Style (
            {	text: ol.layer.Vector.Webpart.Style.Text (fstyle),
                image: ol.layer.Vector.Webpart.Style.Image (fstyle),
                fill: ol.layer.Vector.Webpart.Style.Fill (fstyle),
                stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle)
            })
        ];
    };
};

/** Objets detruits
*/
ol.layer.Vector.Webpart.Style.detruit = function(options)
{	return function (feature, res)
    {	if (!feature.get(feature.getDetruitField())) return [];
        var fstyle = {
            strokeColor: [255,0,0,1],
            strokeWidth: 2,
            strokeColor: [255,0,0,0.5]
        }
        return [
            new ol.style.Style (
            {	text: ol.layer.Vector.Webpart.Style.Text (fstyle),
                image: ol.layer.Vector.Webpart.Style.Image (fstyle),
                fill: ol.layer.Vector.Webpart.Style.Fill (fstyle),
                stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle)
            })
        ];
    };
};

/** Objets vivants
*/
ol.layer.Vector.Webpart.Style.vivant = function(options)
{	return function (feature, res)
    {	if (feature.get(feature.getDetruitField())) return [];
        var fstyle = {
            strokeColor: [0,0,255,1],
            strokeWidth: 2,
            strokeColor: [0,0,255,0.5]
        }
        return [
            new ol.style.Style (
            {	text: ol.layer.Vector.Webpart.Style.Text (fstyle),
                image: ol.layer.Vector.Webpart.Style.Image (fstyle),
                fill: ol.layer.Vector.Webpart.Style.Fill (fstyle),
                stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle)
            })
        ];
    };
};

/**
 * Colors depending on day interval (in days)
 * @param {type} options
 */
ol.layer.Vector.Webpart.Style.interval = function (options) {
    function getColor(feature, interval) {
        var d = feature.get('daterec') ? feature.get('daterec') : new Date(Math.max(new Date(feature.get('date_creation')), new Date(feature.get('date_modification')))).toISOString().slice(0,10);

        var color = "#369";
        for (var i = 0; i < interval.length; i++) {
            if (d < interval[i].date)
                color = interval[i].color;
            else
                break;
        }
        return color;
    }
    ;

    var today = new Date();
    today = today.getTime();

    var interval = new Array();
    for (var i = 0; i < options.length; i++) {
        if (typeof (options[i].age) !== 'undefined') {
            var d = new Date();
            d.setTime(today - (24 * 3600000 * options[i].age));
            interval.push({
                color: options[i].color,
                date: d.getFullYear() + "-" + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + "-" + (d.getDate() < 10 ? '0' : '') + d.getDate()
            });
        } else if (options[i].date) {
            interval.push({
                color: options[i].color,
                date: options[i].date
            });
        }
    }
    interval.sort(function (a, b) {
        a.date > b.date;
    });

    return function (feature, res) {
        var fstyle = {
            strokeColor: getColor(feature, interval),
            strokeWidth: 2,
            fillOpacity: 0.5
        };
        return [
            new ol.style.Style(
                    {text: ol.layer.Vector.Webpart.Style.Text(fstyle),
                        image: ol.layer.Vector.Webpart.Style.Image(fstyle),
                        fill: ol.layer.Vector.Webpart.Style.Fill(fstyle),
                        stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle)
                    })
        ];
    };
};

/** Combinaison de style
* @param {ol.style.StyleFunction | Array<ol.style.StyleFunction>}
*/
ol.layer.Vector.Webpart.Style.combine = function(style)
{	if (!(style instanceof Array)) style = [style];
    return function(feature, res)
    {	var s0 = [];
        for (var i=0; i<style.length; i++)
        {	var s = style[i](feature, res);
            for (var k=0; k<s.length; k++) s0.push(s[k]);
        }
        return s0;
    }
}

/** Affichage du sens de parcours
*	@param {Object} attribute (attribut a tester), glyph (lettre), size, direct (valeur), inverse (valeur)
*/
ol.layer.Vector.Webpart.Style.sens = function(options)
{	if (!options) options =
    {	attribute:'sens_de_circulation',
        glyph: '\u203A', // '>',
        size: "20px",
        direct:'Sens direct',
        inverse:'Sens inverse'
    };
    function fleche(sens)
    {	if (sens == options.direct || sens == options.inverse) return options.glyph;
        return '';
    };
    function lrot(sens, geom)
    {	if (sens != options.direct && sens != options.inverse) return 0;
        if (geom.getType()==='MultiLineString') geom = geom.getLineString(0);
        var geo = geom.getCoordinates();
        var x, y, dl=0, l = geom.getLength();
        for (var i=0; i<geo.length-1; i++)
        {	x = geo[i+1][0]-geo[i][0];
            y = geo[i+1][1]-geo[i][1];
            dl += Math.sqrt(x*x+y*y);
            if (dl>=l/2) break;
        }
        if (sens == options.direct) return -Math.atan2(y,x);
        else return Math.PI-Math.atan2(y,x);
    };

    return function (feature, res)
    {	var sens = feature.get(options.attribute)
        var fstyle =
        {	label: fleche (sens),
            fontWeight: "bold",
            fontSize: options.size,
            labelRotation: lrot(sens, feature.getGeometry())
        }
        return [
            new ol.style.Style (
            {	text: ol.layer.Vector.Webpart.Style.Text (fstyle)
            })
        ];
    };
};
