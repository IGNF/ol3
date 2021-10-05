// const _getcap = ol.source.WMTS.optionsFromCapabilities;
// ol.source.WMTS.optionsFromCapabilities = function(wmtsCap, config) {
	// let options = _getcap.apply(this, [wmtsCap, config]);
	
	// let layers = wmtsCap['Contents']['Layer'];
	// let layer = ol.array.find(layers, function(elt, index, array) {
		// return elt['Identifier'] == config['layer'];
	// });
	// options['title'] = layer.Title;
	// return options; 
// };

/**
 * @constructor IGN's Geoportail Map definition
 * @extends {ol.Map}
 * @param options {ol.Map.options}
 * @returns {ol.Map.Geoportail}
 */
 ol.Map.Geoportail = function(opt_options) {
    var options = opt_options ? opt_options : {};
    ol.Map.call(this, options);

    this.proxyUrl_ = options.proxy || null;

    // Valeur de resolution pour un niveau de zoom de valeur 0
    this._resolutionInit    = 156543.03392804097 ;

    // Ajout du layerSwitcher
    this._layerSwitcher = options.layerSwitcher ? options.layerSwitcher : new ol.control.LayerSwitcher({options: {collapsed:false}});
    this.addControl(this._layerSwitcher);
	
    // Ajout des layers par defaut	
    if (options.addBaseLayer) {
        this.addLayer(new ol.layer.GeoportalWMTS({
            layer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
            olParams: {
                name: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2'
            }
        }));
        this.addLayer(new ol.layer.GeoportalWMTS({
            layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
            olParams: {
                name: 'ORTHOIMAGERY.ORTHOPHOTOS',
                opacity: 0.5
            }
        }));
    }
};

ol.inherits(ol.Map.Geoportail, ol.Map);

/**
 * get layer switcher
 * @returns {ol.control.LayerSwitcher}
 */
ol.Map.Geoportail.prototype.getLayerSwitcher = function()
{
    return this._layerSwitcher;
};


/**
 * get layers by name
 * this function exists in openlayers 2 but not in ol3
 * return Array (ol.Layer)
 */
ol.Map.Geoportail.prototype.getLayersByName = function(name)
{
    var mapLayers = this.getLayers().getArray();
    var layers = mapLayers.filter(
        function(layer) {
            return layer.get('name') === name;
        }, {name: name}
    );

    return layers;
};

/**
 * Ajout d'un layer ripart a la map
 * Geoportail, WMS, WMTS
 * @param {Object} layer
 * @returns {layer}
 */
ol.Map.Geoportail.prototype.addRipartLayer = function(layer)
{
	var options = {
        visible: layer.visibility,
        opacity: layer.opacity
    };

    var service = layer[layer.type];
    if (layer.type === 'geoservice') {
        return this.addGeoservice(service, options);
    } else if (layer.type === 'feature-type') {
        return this.addFeatureType(service, options);
    }

    throw 'Must be a ripart layer';
};

/**
 * Ajout d'un geoservice a la map
 * Geoportail, WMS, WMTS
 * @param {Object} geoservice
 * @param {Object} options (visible, opacity)
 * @returns {layer}
 */
ol.Map.Geoportail.prototype.addGeoservice = function (geoservice, options)
{
    if ( ! geoservice) {
        throw 'geoservice must be defined';
    }

    if( !options ){
        var options = {visible: true, opacity: 1};
    }

	let ign = geoservice.url.includes('wxs.ign.fr');
	let name;

    let extent = geoservice.map_extent.split(",");
    extent = extent.map(function (x) {
        return parseInt(x, 10);
    });

    let bbox = ol.proj.transformExtent(extent, 'EPSG:4326', 'EPSG:3857');
	let version = geoservice.version;
	
    var newLayer = null;
    switch(geoservice.type){
        case 'WMS':
			name = ign ? geoservice.layers : geoservice.title;
            newLayer = new ol.layer.Tile({
                name: name,
                source: new ol.source.TileWMS({
                    url: geoservice.url,
                    attributions: [new ol.Attribution({
                        html: geoservice.description
                    })],
                    params: {
                        LAYERS: geoservice.layers,
                        FORMAT: geoservice.format,
                        VERSION: version || '1.3.0'
                    }/*,
                    projection: 'EPSG:4326'*/
                }),
                visible: options.visible,
                opacity: options.opacity,
                minResolution: this.getResolutionFromZoom(geoservice.max_zoom),
                maxResolution: this.getResolutionFromZoom(geoservice.min_zoom),
                extent: bbox
            });

            newLayer.set('type', 'geoservice');
            newLayer.set('geoservice', geoservice);
            this.addLayer(newLayer);

            // Mise a jour de la couche dans le layer switcher
            this.getLayerSwitcher().addLayer(newLayer, {
                title: geoservice.title,
                description: geoservice.description,
                quicklookUrl: null,
                legends: [],
                metadata: [{url: geoservice.link}]
            });
            this.getLayerSwitcher().setRemovable(newLayer, false);
            this.updateEyeInLayerSwitcher(newLayer, options.visible);
            break;

        case 'WMTS':
			name = ign ? geoservice.layers : geoservice.title;
            newLayer = new ol.layer.Tile({
                name: name,
                source:new ol.source.WMTS({}),
                attribution:[new ol.Attribution({html: 'Some copyright info.'})],
                visible: options.visible,
                opacity: options.opacity,
                minResolution: this.getResolutionFromZoom(geoservice.max_zoom),
                maxResolution: this.getResolutionFromZoom(geoservice.min_zoom),
                extent: bbox
            });

            newLayer.set('type', 'geoservice');
            newLayer.set('geoservice', geoservice);
            this.addLayer(newLayer);

            // Mise a jour de la couche dans le layer switcher
            this.getLayerSwitcher().addLayer(newLayer, {
                title:geoservice.title,
                description: geoservice.description,
                quicklookUrl : null,
                legends: [],
                metadata: [{url:geoservice.link}]
            });
            this.getLayerSwitcher().setRemovable(newLayer,false);
            this.updateEyeInLayerSwitcher(newLayer,options.visible);

            // GetCapabilities
            var url = geoservice.url + (geoservice.url.match(/[\?]/g) ? '&' : '?') + `SERVICE=WMTS&VERSION=${version}&REQUEST=GetCapabilities`;
			if (this.proxyUrl_) {
				url = this.proxyUrl_ + encodeURIComponent(url);
			}
				
            $.ajax({
                url: url,
                type: "GET"
            }).done(function(response) {
				let parser = new ol.format.WMTSCapabilities();

                // Ajout de la couche a la carte
                var wmtsCap = parser.read(response);
                var wmtsOptions = ol.source.WMTS.optionsFromCapabilities(wmtsCap, {
                    layer: geoservice.layers,
                    matrixSet: 'epsg:3857',
                    title: geoservice.title
                });

                newLayer.setSource(new ol.source.WMTS(wmtsOptions));
            }).fail(function(error){
                console.log('erreur getCapabilities wmts');
            });
            break;

        case 'WFS':
            var self = this;
            var format = new ol.format.GeoJSON();

            // Ajout Redmine #7753 (en cours, pourrait nécessiter l'usage du proxy)
            var vectorSource = new ol.source.Vector({
                format: format,
                loader: function(extent) {
                    var url = geoservice.url + (geoservice.url.match(/[\?]/g) ? '&' : '?') + 'service=WFS';
                    var bbox = extent;
                    if (geoservice.version == '1.0.0') {
                        // BBOX avec 4 paramètres : coordonnées
                        // pas de SRSNAME car prend le Default SRS/CRS
                        bbox = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326').join(',');
                        url += '&version=' + geoservice.version +
                        '&request=GetFeature&typeName=' + geoservice.layers +
                        '&outputFormat=' + geoservice.format + '&bbox=' + bbox;
                    } else {
                        // BBOX avec 5 paramètres : coordonnées et SRS
                        if (geoservice.box_srid !== 'EPSG:3857') {
                            bbox = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326').join(',');
                        }
                        bbox += ',' + geoservice.box_srid;
                        url += '&version=' + geoservice.version +
                            '&request=GetFeature&typeName=' + geoservice.layers +
                            '&outputFormat=' + geoservice.format + '&srsname=EPSG:3857&bbox=' + bbox;
                    }

                    if (self.proxyUrl_) {
                        url = self.proxyUrl_ + encodeURIComponent(url);
                    }

                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', url);
                    xhr.onload = function() {
                        if (xhr.status == 200) {
                            vectorSource.addFeatures(
                                vectorSource.getFormat().readFeatures(xhr.responseText,{
                                    featureProjection: 'EPSG:3857'
                                }));
                        }
                    }
                    xhr.send();
                },
                crossOriginKeyword: 'anonymous',
                strategy: ol.loadingstrategy.bbox
            });

            var vectorDefaultStyle = new ol.style.Style({
                fill: new ol.style.Fill({color: "rgba(0, 0, 255, 0.5)"}),
                stroke: new ol.style.Stroke({
                    color: "rgba(0, 0, 255, 1)",
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 5,
                    fill: new ol.style.Fill({color: "rgba(0, 0, 255, 0.5)"}),
                    stroke: new ol.style.Stroke({
                        color: "rgba(0, 0, 255, 1)",
                        width: 2
                    })
                })
            });

            newLayer = new ol.layer.Vector({
                source: vectorSource,
                style: vectorDefaultStyle,
                visible: options.visible,
                opacity: options.opacity,
                minResolution: this.getResolutionFromZoom(geoservice.max_zoom),
                maxResolution: this.getResolutionFromZoom(geoservice.min_zoom),
            });
            newLayer.set('type', 'geoservice');
            newLayer.set('geoservice', geoservice);
            this.addLayer(newLayer);
            this.getLayerSwitcher().addLayer(newLayer, {
                title:geoservice.title,
                description: geoservice.description,
                quicklookUrl : null,
                legends: [],
                metadata: [{url:geoservice.link}]
            });
            this.getLayerSwitcher().setRemovable(newLayer,false);
            this.updateEyeInLayerSwitcher(newLayer,options.visible);
            break;
        default : break;
    }

    return newLayer;
};

/**
 * Ajout d'une couche vecteur a la map
 * @param {Object} featureType
 * @param {Object} opt (visible, opacity, filter ...)
 * @returns {layer}
 */
ol.Map.Geoportail.prototype.addFeatureType = function (featureType, opt, source_options)
{
    var options     = $.extend({visible:true, opacity: 1}, opt);
    var src_options = source_options || {};
    if (featureType.tileZoomLevel) {
        src_options.tileZoom = featureType.tileZoomLevel;
    }
    src_options = $.extend({featureType: featureType}, src_options);
    var style=null;
    if(featureType.style){
      if(ol.layer.Vector.Webpart.Style !== "undefined"){
        var style = new ol.layer.Vector.Webpart.Style.getFeatureStyleFn(featureType);
      }else{
        var hexColor = featureType.style.fillColor;
        if(!hexColor){hexColor="#ee9900";}
        var color = ol.color.asArray(hexColor);
        color = color.slice();
        color[3] = 0.2;
        style = new ol.style.Style({
              fill: new ol.style.Fill({
                color:color
              }),
              stroke: new ol.style.Stroke({
                color:featureType.style.strokeColor,
                width:featureType.style.strokeWidth
              }),
              image: new ol.style.Circle({
                radius: 5,
                fill: new ol.style.Fill({color:[238,153,0,0.5]}),
                stroke: new ol.style.Stroke({color:[238,153,0,1],width:2})
              })
            });
      }
    }else{
      style = new ol.style.Style({
            fill: new ol.style.Fill({color:[238,153,0,0.5]}),
            stroke: new ol.style.Stroke({color:[238,153,0,1],width:2}),
            image: new ol.style.Circle({
              radius: 5,
              fill: new ol.style.Fill({color:[238,153,0,0.5]}),
              stroke: new ol.style.Stroke({color:[238,153,0,1],width:2})
            })
          });
    }
    var vectorLayer = new ol.layer.Vector.Webpart({
        style: style,
        name: featureType.name,
        visible: options.visible,
        opacity: options.opacity,
        minResolution: this.getResolutionFromZoom(featureType.maxZoomLevel),
        maxResolution: this.getResolutionFromZoom(featureType.minZoomLevel)
    },src_options);

    vectorLayer.set('type', 'feature-type');
    vectorLayer.set('feature-type', featureType);
    this.addLayer(vectorLayer);

    var lsOptions = {
        title:featureType.name
    };
    if (featureType.description) {
        lsOptions.description = featureType.description;
    } else {
        lsOptions.description = 'Pas de description';
    }
    if (typeof(Routing) !== 'undefined') {
        lsOptions.metadata = [{
            url: Routing.generate('gcms_feature_type_view', {databaseName: featureType.database, typeName: featureType.name })
        }];
    }
    this.getLayerSwitcher().addLayer(vectorLayer, lsOptions);

    this.getLayerSwitcher().setRemovable(vectorLayer,false);
    this.updateEyeInLayerSwitcher(vectorLayer, options.visible);

    return vectorLayer;
};

/**
 * @param {type} geoservice
 * @returns {undefined}
 */
ol.Map.Geoportail.prototype.removeGeoservice = function (layername)
{
	var layers = this.getLayersByName(layername);
	$.each(layers, function(index, layer) {
		this.removeLayer(layer);
	});
};

/**
 * Mise a jour des de l'oeil barre ou non dans le layerswitcher apres avoir ajoute la couche dans la map
 * @param {ol.layer} olLayer
 * @param {bool} visibility
 * @returns {undefined}
 */
ol.Map.Geoportail.prototype.updateEyeInLayerSwitcher = function (olLayer, visibility){
    var idlayer = this.getLayerSwitcher().getLayerDOMId(olLayer);

    var n = idlayer.indexOf('_');
    var id = idlayer.substr(n+1);
    document.getElementById("GPvisibility_"+id).checked = visibility;
};

/**
 * Retourne la resolution pour un niveau de zoom donne
 * @param {integer} zoom
 * @returns {float} resolution
 */
ol.Map.Geoportail.prototype.getResolutionFromZoom = function (zoom){
    var resolution = this._resolutionInit / Math.pow(2,zoom) ;
    return resolution;
};