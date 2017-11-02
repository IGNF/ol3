/** 
 * @namespace ol.layer.Vector.Webpart.Style
 */
ol.layer.Vector.Webpart.Style = {};

// Variable globale, cache pour image icon
// Tous les styles sont mis en cache avec comme clé le nom de la couche + le nom de l'icone
// On ne met pas en cache les icones contenant un label, sinon elles portent toutes le meêm label.
var styleCache = {};

/** Format string with pattern ${attr}
 * Remplace ${attr} par la valeur de attr
 * @param {String} pattern
 * @param {ol.Feature} feature width properties
 */
ol.layer.Vector.Webpart.Style.formatProperties = function (format, feature)
{
    if (!format || !format.replace || !feature) {
        return format;
    }
    var reg = new RegExp(/\$\{([^\}]*)\}/);
    var result = null;
    while ((result = reg.exec(format)) !== null) {
        if(feature.get(result[1])===null){
            format = format.replace("${" + result[1] + "}", '');            
        }else{
            format = format.replace("${" + result[1] + "}", feature.get(result[1]));
        };       
    }
    return format;
};

/**
 * Remplace ${externalGraphic} par la valeur de l'attribut de symbolisation du featureType
 * @param {string} format
 * @param {type} featureType
 * @param {ol.Feature} feature
 * @returns {string}
 */
ol.layer.Vector.Webpart.Style.formatExternalGraphic = function (format, featureType, feature) {
    if (!format || !format.replace || !feature)
        return format;
    return format.replace("${externalGraphic}", feature.get(featureType.symbo_attribute.name)).toLowerCase();
}

/** Format Style with pattern ${attr}
 * @param {style} 
 * @param {ol.Feature} feature width properties
 */
ol.layer.Vector.Webpart.Style.formatFeatureStyle = function (featureType, feature)
{
    if (!featureType.style)
        return {};
    var fstyle = featureType.style;
    var fs = {};
    for (var i in fstyle)
    {
        if (i === "externalGraphic" && fstyle[i] === "${externalGraphic}") {
            fs[i] = ol.layer.Vector.Webpart.Style.formatExternalGraphic(fstyle[i], featureType, feature);
        } else {
            fs[i] = ol.layer.Vector.Webpart.Style.formatProperties(fstyle[i], feature);
        }
    }
    return fs;
};

/** Get stroke style from featureType.style
 * @param {featureType.style | {color,width} | undefined}
 * @return ol.style.Stroke
 */
ol.layer.Vector.Webpart.Style.Stroke = function (fstyle) {
    var stroke = new ol.style.Stroke({
        color: fstyle.strokeColor || "#00f",
        width: Number(fstyle.strokeWidth) || 1
    });
    if (fstyle.strokeOpacity) {
        var a = ol.color.asArray(stroke.getColor());
        if (a.length) {
            a[3] = Number(fstyle.strokeOpacity);
            stroke.setColor(a);
        }
    }
    return stroke;
};

/** Get fill style from featureType.style
 *	@param {featureType.style | undefined}
 *	@return ol.style.Fill
 */
ol.layer.Vector.Webpart.Style.Fill = function (fstyle)
{
    var fill = new ol.style.Fill({
        color: fstyle.fillColor || "rgba(255,255,255,0.5)"
    });
    if (fstyle.fillOpacity) {
        var a = ol.color.asArray(fill.getColor());
        if (a.length) {
            a[3] = Number(fstyle.fillOpacity);
            fill.setColor(a);
        }
    }
    return fill;
};

/** Get Image style from featureType.style
 *	@param {featureType.style |  undefined}
 *	@param bool true si bibli de style
 *	@return ol.style.Image
 */
ol.layer.Vector.Webpart.Style.Image = function (fstyle, bool)
{
    var image;
    var radius = Number(fstyle.pointRadius) || 5;
    var graphic =
            {cross: [4, radius, 0, 0],
                square: [4, radius, undefined, Math.PI / 4],
                triangle: [3, radius, undefined, 0],
                star: [5, radius, radius / 2, 0],
                x: [4, radius, 0, Math.PI / 4]
            };

    //graphicName        
    switch (fstyle.graphicName)
    {
        case "cross":
        case "star":
        case "square":
        case "triangle":
            var graphic =
                    {cross: [4, radius, 0, 0],
                        square: [4, radius, undefined, Math.PI / 4],
                        triangle: [3, radius, undefined, 0],
                        star: [5, radius, radius / 2, 0],
                        x: [4, radius, 0, Math.PI / 4]
                    };
            var g = graphic[fstyle.graphicName] || graphic.square;
            image = new ol.style.RegularShape(
                    {points: g[0],
                        radius: g[1],
                        radius2: g[2],
                        rotation: g[3]+ (Number(fstyle.rotation) * Math.PI / 180),
                        stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle),
                        fill: ol.layer.Vector.Webpart.Style.Fill(fstyle)
                    });
            break;
        default:
            image = new ol.style.Circle(
                    {radius: radius,
                        stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle),
                        fill: ol.layer.Vector.Webpart.Style.Fill(fstyle)
                    });
            break;
    }
    //externalGraphic
    if (fstyle.externalGraphic) {
        if (bool) {
            src = urlLibraryImg + "./../../" + fstyle.name + "/" + fstyle.externalGraphic;
        } else {
            src = urlImgAlone + "./../" + fstyle.externalGraphic ;
        }
        if(fstyle.graphicWidth && fstyle.graphicHeight){
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
    };
    return image;    
};

/** Get Text style from featureType.style
 *	@param {featureType.style | undefined}
 *	@return ol.style.Text
 */
ol.layer.Vector.Webpart.Style.Text = function (fstyle)
{
    return new ol.style.Text({
        font: (fstyle.fontWeight || '')
            + " "
            + (fstyle.fontSize || "12") + "px"
            + " "
            + (fstyle.fontFamily || 'Sans-serif'),
        text: fstyle.label, // TODO si ${attr}
        rotation: (fstyle.labelRotation || 0),
        textAlign: "start",
        textBaseline: "middle",
        offsetX: Number(fstyle.labelXOffset) || 0,
        offsetY: -Number(fstyle.labelYOffset) || 0,
        stroke: new ol.style.Stroke({
            color: fstyle.labelOutlineColor || "#fff",
            width: Number(fstyle.labelOutlineWidth) || 2
        }),
        fill: new ol.style.Fill({
            color: fstyle.fontColor
        })
    });
};

(function () {

    //rafraichit le style si l'image d'un ponctuel n'existe pas 
    //(remplace image par un symbole par defaut -> cercle )    
    function refreshStyle(feature, fstyle, st)
    {
        var symb = st[0].getImage();
        if (!symb)
            return;
        var img = symb.getImage();
        img.onerror = function ()
        {
            if (styleCache['default']) {
                st[0] = styleCache['default'];
            } else {
                styleCache['default'] = new ol.style.Style(
                        {
                            image: new ol.style.Circle({
                                radius: 10,
                                fill: new ol.style.Fill({
                                    color: [255, 165, 0, 0.5]
                                }),
                                stroke: new ol.style.Stroke({
                                    color: [255, 165, 0, 1],
                                    width: 2
                                })
                            })
                        });
                st[0] = styleCache['default'];
            }
            feature.changed();
        };
    };

    /** Get ol.style.function as defined in featureType
     * @param {featureType}
     * @return { ol.style.function | undefined }
     */
    ol.layer.Vector.Webpart.Style.getFeatureStyleFn = function (featureType)
    {
        if (! featureType) { featureType = {}; }
        
        /**
         * Remplace les valeurs de proprietes de style ${xxxx} par leur valeur
         * @param {ol.feature} feature
         * @param {string} property
         * @returns {ol.layer.Vector.Webpart.Style.getFeatureStyleFn.format.webpartstyleAnonym$13}
         */
        function format(feature, property) {
			var reg = new RegExp(/\$\{([^\}]*)\}/);
			
			var result = reg.exec(property);
			if (result !== null) {
				var value = feature.get(result[1]);
				if (value === null) {
					property = property.replace("${" + result[1] + "}", ''); 
				} else {
					property = property.replace("${" + result[1] + "}", value); 
				}		
				return { value: property, computed: true };
			}
			return { value: property, computed: false };
		}
        
        /**
         *  Retourne l'identifiant du style. celui-ci est composé de :
         *      - featureType.name
         *      - si featureType.style.externalGraphic est defini, le nom du symbole.
         *      - Les proprietes du style sont de type ${champ}
         * @param {featureType} featureType
         * @param {ol.feature} feature
         */
        function getCacheId(featureType, feature) {
            var cacheids = [featureType.name];
            
            var fstyle  = featureType.style;
            if (! fstyle) { return cacheids[0]; }
            
            if (fstyle.externalGraphic) {
                if (featureType.symbo_attribute && feature.getProperties()[featureType.symbo_attribute.name]) {
                    cacheids.push(feature.getProperties()[featureType.symbo_attribute.name]);
                } else {
                    cacheids.push(featureType.style.externalGraphic);
                }
            }

            for (var property in fstyle) {
                if (property === 'externalGraphic' || 
                    property === 'label' ) { continue; }
     
				var frmt = format(feature, fstyle[property]);
				if (frmt.computed) {
					if (! frmt.value) cacheids.push('null');
					else cacheids.push(frmt.value);
				}
            }

            return cacheids.join('-');   
        }
        
        return function (feature, res)
        {
            if (! feature) { return []; }

            // l'identifiant du cache
            var idcache = getCacheId(featureType, feature);
            
            if (featureType.style && featureType.style.label) {
                // on ne peut pas garder en cache un style avec un label
                // il est différent pour tous les objets
                style = false;
            } else {
                var style = styleCache[idcache];
            }
            if (!style) {
                //le style n'a pas encore ete defini
                var fstyle = ol.layer.Vector.Webpart.Style.formatFeatureStyle(featureType, feature);
                if (featureType.symbo_attribute && featureType.symbo_attribute.name!=="") {
                    bool = true;
                } else {
                    bool = false;
                }
                ;
                styleCache[idcache] = [
                    new ol.style.Style(
                            {text: ol.layer.Vector.Webpart.Style.Text(fstyle),
                                image: ol.layer.Vector.Webpart.Style.Image(fstyle, bool),
                                fill: ol.layer.Vector.Webpart.Style.Fill(fstyle),
                                stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle)
                            })
                ];
                refreshStyle(feature, fstyle, styleCache[idcache]);
            }
            ;
            /*feature.setStyle(style);*/
            return styleCache[idcache];
        };
    };

})();

/** Default style
 *	@return {ol.style.Style}
 */
ol.layer.Vector.Webpart.Style.Default = ol.layer.Vector.Webpart.Style.getFeatureStyleFn()()[0];

/** Objets mort-vivant
 */
ol.layer.Vector.Webpart.Style.zombie = function (options)
{
    function getColor(feature, opacity)
    {
        return (feature.get('detruit') ? [255, 0, 0, opacity] : [0, 0, 255, opacity]);
    }
    ;

    return function (feature, res)
    {
        var fstyle = {
            strokeColor: getColor(feature, 1),
            strokeWidth: 2,
            fillColor: getColor(feature, 0.5)
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

/** Objets detruits
 */
ol.layer.Vector.Webpart.Style.detruit = function (options) {
    return function (feature, res) {
        if (!feature.get('detruit'))
            return [];
        var fstyle = {
            strokeColor: [0, 0, 255, 1],
            strokeWidth: 2
        };
        return [
            new ol.style.Style({
                text: ol.layer.Vector.Webpart.Style.Text(fstyle),
                image: ol.layer.Vector.Webpart.Style.Image(fstyle),
                fill: ol.layer.Vector.Webpart.Style.Fill(fstyle),
                stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle)
            })
        ];
    };
};

/** Objets vivants
 */
ol.layer.Vector.Webpart.Style.vivant = function (options) {
    return function (feature, res) {
        if (feature.get('detruit'))
            return [];
        var fstyle = {
            strokeColor: [0, 0, 255, 1],
            strokeWidth: 2
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

/**
 * Colors depending on day interval (in days)
 * @param {type} options
 */
ol.layer.Vector.Webpart.Style.interval = function (options) {
    function getColor(feature, interval) {
        var d = feature.get('daterec');

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
ol.layer.Vector.Webpart.Style.combine = function (style)
{
    if (!(style instanceof Array))
        style = [style];
    return function (feature, res) {
        var s0 = [];
        for (var i = 0; i < style.length; i++)
        {
            var s = style[i](feature, res);
            for (var k = 0; k < s.length; k++)
                s0.push(s[k]);
        }
        return s0;
    };
};


/** Style des troncon de route DBUni
 */
ol.layer.Vector.Webpart.Style.troncon_de_route = function (options)
{
    if (!options)
        options = {};

    function getColor(feature)
    {
        if (options.vert && feature.get('itineraire_vert') === "Appartient")
        {
            if (feature.get('position_par_rapport_au_sol') !== "0")
                return "#006400";
            else
                return "green";
        }
        if (!feature.get('importance'))
            return "magenta";
        if (feature.get('position_par_rapport_au_sol') !== "0")
        {
            switch (feature.get('importance'))
            {
                case "1":
                    return "#B11BB1";
                case "2":
                    return "#B11B1B";
                case "3":
                    return "#D97700";
                case "4":
                    return "#FFE100";
                case "5":
                    return "#CCCCCC";
                default:
                    return "#D3D3D3";
            }
        } else
        {
            switch (feature.get('importance'))
            {
                case "1":
                    return "#FF00FF";
                case "2":
                    return "red";
                case "3":
                    return "#FFA500";
                case "4":
                    return "yellow";
                case "5":
                    return "white";
                default:
                    return "#D3D3D3";
            }
        }
        return "#808080";
    }
    ;

    function getWidth(feature)
    {
        return Math.max(Number(feature.get('largeur_de_chaussee')) || 2, 2);
        /*
         if (feature.get('largeur_de_chaussee')) return Math.max (Number(feature.get('largeur_de_chaussee')),2);
         return 2;
         */
    }
    ;

    function getZindex(feature)
    {
        if (!feature.get('position_par_rapport_au_sol'))
            return 100;
        var pos = Number(feature.get('position_par_rapport_au_sol'));
        if (pos > 0)
            return 10 + pos * 10 - (Number(feature.get('importance')) || 10);
        else if (pos < 0)
            return Math.max(4 + pos, 0);
        else
            return 10 - (Number(feature.get('importance')) || 10);
        return 0;
    }
    ;

    return function (feature, res)
    {
        var fstyle = {
            strokeColor: getColor(feature),
            strokeWidth: getWidth(feature)
        };
        return [
            new ol.style.Style(
                    {stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle),
                        zIndex: getZindex(feature) - 100
                    })
        ];
    };
};

/** Affichage du sens de parcours
 *	@param {Object} attribute (attribut a tester), glyph (lettre), size, direct (valeur), inverse (valeur)
 */
ol.layer.Vector.Webpart.Style.sens = function (options)
{
    if (!options)
        options =
                {attribute: 'sens_de_circulation',
                    glyph: '\u203A', // '>',
                    size: "20px",
                    direct: 'Sens direct',
                    inverse: 'Sens inverse'
                };

    function fleche(sens)
    {
        if (sens === options.direct || sens === options.inverse)
            return options.glyph;
        return '';
    }
    ;
    function lrot(sens, geom)
    {
        if (sens !== options.direct && sens !== options.inverse)
            return 0;
        var geo = geom.getCoordinates();
        var x, y, dl = 0, l = geom.getLength();
        for (var i = 0; i < geo.length - 1; i++)
        {
            x = geo[i + 1][0] - geo[i][0];
            y = geo[i + 1][1] - geo[i][1];
            dl += Math.sqrt(x * x + y * y);
            if (dl >= l / 2)
                break;
        }
        if (sens === options.direct)
            return -Math.atan2(y, x);
        else
            return Math.PI - Math.atan2(y, x);
    }
    ;

    return function (feature, res)
    {
        var sens = feature.get(options.attribute)
        var fstyle =
                {label: fleche(sens),
                    fontWeight: "bold",
                    fontSize: options.size,
                    labelRotation: lrot(sens, feature.getGeometry())
                }
        return [
            new ol.style.Style(
                    {text: ol.layer.Vector.Webpart.Style.Text(fstyle)
                    })
        ];
    };
};

/** Affichage D'un toponyme
 *	@param {Object} attribute (attribut a afficher), weight, size, minResolution, maxResolution
 */
ol.layer.Vector.Webpart.Style.toponyme = function (options) {
    if (!options) {
        options = {attribute: 'nom', size: "12px"};
    }
    if (!options.minResolution)
        options.minResolution = 0;
    if (!options.maxResolution)
        options.maxResolution = 2;

    return function (feature, res)
    {
        if (res > options.maxResolution || res < options.minResolution)
            return [];
        var fstyle =
                {label: feature.get(options.attribute),
                    fontWeight: options.weight,
                    fontSize: options.size
                }
        return [
            new ol.style.Style(
                    {text: ol.layer.Vector.Webpart.Style.Text(fstyle)
                    })
        ];
    };
};

/** Affichage de la couche batiment
 *	@param {Object} symbol (affiche un symbole Fontawesome), color (couleur du symbol) 
 */
ol.layer.Vector.Webpart.Style.batiment = function (options)
{
    if (!options)
        options = {};

    function getColor(feature, opacity)
    {
        switch (feature.get('nature'))
        {
            case "Industriel, agricole ou commercial":
                return [51, 102, 153, opacity];
            case "Remarquable":
                return [0, 192, 0, opacity];
            default:
                switch (feature.get('fonction'))
                {
                    case "Indifférenciée":
                        return [128, 128, 128, opacity];
                    case "Sportive":
                        return [51, 153, 102, opacity];
                    case "Religieuse":
                        return [153, 102, 51, opacity];
                    default:
                        return [153, 51, 51, opacity];
                }
        }
    }
    ;

    function getSymbol(feature, opacity)
    {
        switch (feature.get('fonction'))
        {
            case "Commerciale":
                return "\uf217";
            case "Sportive":
                return "\uf1e3";
            case "Mairie":
                return "\uf19c";
            case "Gare":
                return "\uf239";
            case "Industrielle":
                return "\uf275";
            default:
                return null;
        }
    }
    ;

    return function (feature, res)
    {
        var fstyle =
                {strokeColor: getColor(feature, 1),
                    fillColor: getColor(feature, 0.5)
                };
        if (options.symbol)
        {
            fstyle.label = getSymbol(feature);
            fstyle.fontFamily = "Fontawesome";
            fstyle.fontColor = options.color || "magenta";
        }
        if (fstyle.label)
        {
            return [
                new ol.style.Style(
                        {text: ol.layer.Vector.Webpart.Style.Text(fstyle),
                            stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle),
                            fill: ol.layer.Vector.Webpart.Style.Fill(fstyle)
                        })
            ];
        } else
        {
            return [
                new ol.style.Style(
                        {stroke: ol.layer.Vector.Webpart.Style.Stroke(fstyle),
                            fill: ol.layer.Vector.Webpart.Style.Fill(fstyle)
                        })
            ];
        }
    };
};