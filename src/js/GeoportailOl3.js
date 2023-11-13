/**
 * @constructor Gestion des GetCapabilities
 */
 GPConfig = function() {
	this._capabilities = {};
};

/**
 * Recuperation GetCapabilities
 * @param {string} url
 */
GPConfig.prototype.getCapabilities = async function(url) {
	if (url in this._capabilities) {
		return this._capabilities[url];
	}
  
	let response = await fetch(url);
	if (! response.ok)
		throw new Error(`Bad response from server : ${response.status}`);

	let caps = await response.text();
	let format = new ol.format.WMTSCapabilities();
	let capabilities = format.read(caps);
	if (! capabilities)
		throw new Error("Reading capabilities failed");

	this._capabilities[url] = capabilities;
	return capabilities;
};

/**
 * @constructor IGN's Geoportail Map definition
 * @extends {ol.Map}
 * @param options {ol.Map.options} 
 *		+ proxy
 * @returns {ol.Map.Geoportail}
 */
ol.Map.Geoportail = function(opt_options) 
{
    let options = opt_options ? opt_options : {};
    ol.Map.call(this, options);

    this._proxyUrl = options.proxy || null;
	this._apiKey   = options.apiKey || null;
	
    // Valeur de resolution pour un niveau de zoom de valeur 0
    this._resolutionInit = 156543.03392804097 ;
	this._maxExtent4326 = [-180, -90, 180, 90];
	this._maxExtent3857 = [-20037508.342789244, -238107693.26496765, 20037508.342789244, 238107693.26496765];
	
    // Ajout du layerSwitcher
    this._layerSwitcher = options.layerSwitcher ? options.layerSwitcher : new ol.control.LayerSwitcher({options: {collapsed:false}});
    this.addControl(this._layerSwitcher);
		
	this._gpConfig = new GPConfig();
	if (options.addBaseLayer) {
		if (this._apiKey) this.addGeoportalLayer(this._apiKey, "GEOGRAPHICALGRIDSYSTEMS.MAPS");
		this.addGeoportalLayer("ortho", "ORTHOIMAGERY.ORTHOPHOTOS");
		this.addGeoportalLayer("cartes", "GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2"); 
	}

	/**
	 * Retourne l'attribution en fonction des parametres d'attributions
	 * @param {Object} geoservice 
	 * @returns 
	 */
	 this._getAttribution = function(geoservice) {
		let result = null;
		
		let name 	= geoservice.attribution_name;
		let url 	= geoservice.attribution_logo_url;
		let logoUrl = geoservice.attribution_logo_url;
		if (! name && !url && !logoUrl) return null;

		if (url && logoUrl && name) {
			result = `<a target="_blank" href="${url}"><img class="gp-control-attribution-image" src="${logoUrl}" title="${name}"></a>`;
		} else if (url && logoUrl) {
			result = `<a target="_blank" href="${url}"><img class="gp-control-attribution-image" src="${logoUrl}"></a>`;	
		} else if (url && name) {
			result = `<a target="_blank" href="${url}" title="${name}">${url}</a>`;	
		} else if (logoUrl && name) {
			result = `<img class="gp-control-attribution-image" src="${logoUrl}" title="${name}"></img>`;
		} else if (logoUrl) {
			result = `<img class="gp-control-attribution-image" src="${logoUrl}"></img>`;	
		} else if (name) {
			result = name;	
		}
		
		return result;
	};

	// Metadonnees et attribution IGN
	this._metadataIGN = 'https://geoservices.ign.fr/';
	let attribution = this._getAttribution({ 
		'attribution_name': "Institut national de l'information géographique et forestière",
		'attribution_url' : 'https://www.ign.fr/',
		'attribution_logo_url': 'https://data.geopf.fr/annexes/ressources/logos/ign.gif'

	});
	this._attributionIGN = new ol.Attribution({ html: attribution });
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
 * Ajout d'une couche du Geoportail
 * @param {string} key : cartes|ortho ...
 * @param {string} layer : ORTHOIMAGERY.ORTHOPHOTOS
 * @param {object} opt_options : visible and opacity
 * @returns {undefined}
 */
 ol.Map.Geoportail.prototype.addGeoportalLayer = function(key, layer, opt_options) {
	let _self = this;

	let options = opt_options || { visible: true, opacity: 1 };
	let visible = options.visible || true;
    let opacity = options.opacity || 1;
	
	let newLayer = new ol.layer.Tile({
		name: layer,
		visible: visible,
		opacity: opacity
	});
	this.addLayer(newLayer);
  
	let url = `https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities`;
	if (this._proxyUrl) {
		url = this._proxyUrl + encodeURIComponent(url);
	}
		
	this._gpConfig.getCapabilities(url)
		.then(capabilities => {
			// Mise en place de la source de la couche
			let wmtsOptions = ol.source.WMTS.optionsFromCapabilities(capabilities, {
				layer: layer
			});
			if (! wmtsOptions) {
				throw new Error(`Layer [${layer}] does not exist`);
			}
			wmtsOptions['attributions'] = this._attributionIGN;
			
			let layers = capabilities['Contents']['Layer'];
			const descLayer = layers.find(element => {
				return element['Identifier'] == layer;
			});

			// Min et Max et extent
			var bbox = ol.proj.transformExtent(descLayer.WGS84BoundingBox, 'EPSG:4326', 'EPSG:3857');
			
			let matrixIds = wmtsOptions.tileGrid.matrixIds_;
			let minZoom = parseInt(matrixIds[0], 10);
			let maxZoom = parseInt(matrixIds.slice(-1)[0], 10);

			newLayer.setMinResolution(_self.getResolutionFromZoom(maxZoom));
			newLayer.setMaxResolution(_self.getResolutionFromZoom(minZoom));
			newLayer.setExtent(bbox);
			wmtsOptions['crossOrigin'] = 'Anonymous';
			newLayer.setSource(new ol.source.WMTS(wmtsOptions));
			
			// Mise a jour de la couche dans le layer switcher
			_self.getLayerSwitcher().addLayer(newLayer, {
				title: descLayer.Title,
				description: descLayer.Abstract,
				metadata: [{ url: this._metadataIGN }]
			});
			_self.getLayerSwitcher().setRemovable(newLayer, false);
			_self.updateEyeInLayerSwitcher(newLayer, options.visible);
		}).catch(error => {
			_self.removeLayer(newLayer);
			if (error instanceof TypeError)
				console.error(error.message);
			else console.error(error);
		});
		
	return newLayer;
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
    if (! geoservice) {
        throw 'geoservice must be defined';
    }

    if(! options) {
        var options = {visible: true, opacity: 1};
    }

    var extent = geoservice.map_extent.split(",");
    extent = extent.map(function (x) {
        return parseInt(x, 10);
    });

    var bbox = ol.proj.transformExtent(extent, 'EPSG:4326', 'EPSG:3857');

    var newLayer = null;
    switch(geoservice.type){
        case 'WMS':	
			newLayer = this.addWMSGeoservice(geoservice, options);
			break;
        case 'WMTS':
			newLayer = this.addWMTSGeoservice(geoservice, options);
			break;
        case 'WFS':
			newLayer = this.addWFSGeoservice(geoservice, options);
			break;
        default : throw "Geoservice type unknown";
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
    if (featureType.style){
		if (ol.layer.Vector.Webpart.Style !== "undefined"){
			var style = new ol.layer.Vector.Webpart.Style.getFeatureStyleFn(featureType);
		} else {
			var hexColor = featureType.style.fillColor;
			if (!hexColor) {hexColor="#ee9900";}
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
	} else {
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
		name: featureType.name,
		type: 'feature-type',
		'feature-type': featureType,
		visible: options.visible,
		opacity: options.opacity,
		style: style,
		minResolution: this.getResolutionFromZoom(featureType.maxZoomLevel),
		maxResolution: this.getResolutionFromZoom(featureType.minZoomLevel)
    },src_options);

	var lsOptions = {
        title:featureType.title,
		visible: options.visible
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
	
    this.addNewLayer(vectorLayer, lsOptions);
    return vectorLayer;
};

/**
 * Ajout d'un geoservice WMS a la map
 * @param {Object} geoservice
 * @param {Object} options (visible, opacity)
 * @returns {layer}
 */
ol.Map.Geoportail.prototype.addWMSGeoservice = function (geoservice, options) 
{
	let isIGN = new RegExp(/https:\/\/data.geopf.fr\//).test(geoservice.url);

	let bbox = this.getExtent(geoservice.map_extent);

	let newLayer = new ol.layer.Tile({
		name: geoservice.title,
		type:  'geoservice',
		geoservice: geoservice,
		source: new ol.source.TileWMS({
			url: geoservice.url,
			attributions: new ol.Attribution({
				html: this._getAttribution(geoservice)
			}),
			params: {
				LAYERS: geoservice.layers,
				FORMAT: geoservice.format,
				VERSION: geoservice.version || '1.3.0'
			}
		}),
		visible: options.visible,
		opacity: options.opacity,
		minResolution: this.getResolutionFromZoom(geoservice.max_zoom),
		maxResolution: this.getResolutionFromZoom(geoservice.min_zoom),
		extent: bbox
	});
	
	let metadata = isIGN ? { url: this._metadataIGN } : { url: geoservice.link };
	this.addNewLayer(newLayer, {
		title: geoservice.title,
		visible: options.visible,
		description: geoservice.description,
		metadata: [metadata]
	});
	
	return newLayer;
};

/**
 * Ajout d'un geoservice WMTS a la map
 * @param {Object} geoservice
 * @param {Object} options (visible, opacity)
 * @returns {layer}
 */
ol.Map.Geoportail.prototype.addWMTSGeoservice = function (geoservice, options) 
{
	let _self = this;
	let isIGN = new RegExp(/https:\/\/data.geopf.fr\//).test(geoservice.url);

	let bbox = this.getExtent(geoservice.map_extent);
	let newLayer = new ol.layer.Tile({
		name: geoservice.layers,
		type: 'geoservice',
		geoservice: geoservice,
		source:new ol.source.WMTS({
			"crossOrigin": "Anonymous"
		}),
		visible: options.visible,
		opacity: options.opacity,
		minResolution: this.getResolutionFromZoom(geoservice.max_zoom),
		maxResolution: this.getResolutionFromZoom(geoservice.min_zoom),
		extent: bbox
	});
	
	let metadata = isIGN ? { url: this._metadataIGN } : { url: geoservice.link };
	this.addNewLayer(newLayer, {
		title:geoservice.title,
		visible: options.visible,
		description: geoservice.description,
		metadata: [metadata]
	});

	// GetCapabilities
	let version = geoservice.version;
	let url = geoservice.url + (new RegExp(/[\?]/g).test(geoservice.url) ? '&' : '?') + `SERVICE=WMTS&VERSION=${version}&REQUEST=GetCapabilities`;
	
	this._gpConfig.getCapabilities(url)
		.then(capabilities => {
			let wmtsOptions = ol.source.WMTS.optionsFromCapabilities(capabilities, {
				layer: geoservice.layers,
				matrixSet: 'EPSG:3857'
			});
			if (! wmtsOptions) {
				throw new Error(`Layer [${geoservice.layers}] does not exist`);
			}
			
			let attributions = new ol.Attribution({
				html: this._getAttribution(geoservice)
			});
			wmtsOptions['attributions'] = attributions;
			wmtsOptions['crossOrigin'] = 'Anonymous';
			newLayer.setSource(new ol.source.WMTS(wmtsOptions));
		}).catch(error => {
			_self.removeLayer(newLayer);
			if (error instanceof TypeError)
				console.error(error.message);
			else console.error(error);
		});
	
	return newLayer;
};
	

/**
 * Ajout d'un geoservice WFS a la map
 * @param {Object} geoservice
 * @param {Object} options (visible, opacity)
 * @returns {layer}
 */
ol.Map.Geoportail.prototype.addWFSGeoservice = function (geoservice, options) 
{
	let self = this;	
	let format = new ol.format.GeoJSON();

	let extent = geoservice.map_extent.split(",");
    extent = extent.map(function (x) {
        return parseInt(x, 10);
    });
	
	// Ajout Redmine #7753 (en cours, pourrait nécessiter l'usage du proxy)
	let source = new ol.source.Vector({
		format: format,
		loader: function(extent) {
			let url = geoservice.url + (new RegExp(/[\?]/g).test(geoservice.url) ? '&' : '?') + 'service=WFS';
			let bbox = extent;
			
			if (geoservice.version == '1.0.0') {
				// BBOX avec 4 paramètres : coordonnées
				// pas de SRSNAME car prend le Default SRS/CRS
				bbox = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326').join(',');
				url += '&version=' + geoservice.version + '&request=GetFeature&typeName=' + geoservice.layers + '&outputFormat=' + geoservice.format + '&bbox=' + bbox;
			} else {
				// BBOX avec 5 paramètres : coordonnées et SRS
				if (geoservice.box_srid !== 'EPSG:3857') {
					bbox = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326').join(',');
				}
				bbox += ',' + geoservice.box_srid;
				url += '&version=' + geoservice.version + '&request=GetFeature&typeName=' + geoservice.layers +	'&outputFormat=' + geoservice.format + '&srsname=EPSG:3857&bbox=' + bbox;
			}

			if (self._proxyUrl) {
				url = self._proxyUrl + encodeURIComponent(url);
			}

			fetch(url).then(response => {
				if (! response.ok) 
					throw Error("Bad response from server");
				return response.text();
			}).then(response => {
				source.addFeatures (
					source.getFormat().readFeatures(response,{
						featureProjection: 'EPSG:3857'
					})
				);
			});
		},
		attributions: new ol.Attribution({
			html: this._getAttribution(geoservice)
		}),
		crossOriginKeyword: 'anonymous',
		strategy: ol.loadingstrategy.bbox
	});

	let defaultStyle = new ol.style.Style({
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

	let newLayer = new ol.layer.Vector({
		name: geoservice.title,
		type: 'geoservice',
		geoservice: geoservice,
		source: source,
		style: defaultStyle,
		visible: options.visible,
		opacity: options.opacity,
		minResolution: this.getResolutionFromZoom(geoservice.max_zoom),
		maxResolution: this.getResolutionFromZoom(geoservice.min_zoom)
	});

	this.addNewLayer(newLayer, {
		title: geoservice.title,
		visible: options.visible,
		description: geoservice.description,
		metadata: [{url:geoservice.link}]
	});
};
	
/**
 * @param {string} mapExtent
 * @returns {ol.Extent}
 */
ol.Map.Geoportail.prototype.getExtent = function(mapExtent) {
	let extent = mapExtent.split(",");
    extent = extent.map(function (x) {
        return parseInt(x, 10);
    });

	let bbox = this._maxExtent3857;
	if (! ol.extent.equals(extent, this._maxExtent4326)) {
		bbox = ol.proj.transformExtent(extent, 'EPSG:4326', 'EPSG:3857');
	}
	
	return bbox;
};
	
/**
 * @param {ol.layer} layer
 * @param {Object} options
 * @returns {undefined}
 */
ol.Map.Geoportail.prototype.addNewLayer = function(layer, options)
{
	this.addLayer(layer);
	
	// Ajout dans le layerSwitcher
	this.getLayerSwitcher().addLayer(layer, options);
    this.getLayerSwitcher().setRemovable(layer, false);
    this.updateEyeInLayerSwitcher(layer, options.visible);
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