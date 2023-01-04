import GPConfig from './GPConfig';
import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import WMTS from 'ol/source/WMTS';
import VectorSource from 'ol/source/Vector';
import { optionsFromCapabilities } from 'ol/source/WMTS';
import { transformExtent } from 'ol/proj';
import { Style, Circle, Stroke, Fill } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import { bbox as bbox_strategy } from 'ol/loadingstrategy';
import { equals as extent_equals } from 'ol/extent';
import ol_control_LayerSwitcher from "ol-ext-4.0.4/control/LayerSwitcher";
import WebpartStyle from './style/webpartstyle';
import WebpartLayer from './layer/webpartlayer';
import { Utilities } from '../Utilities';

class GeoportalMap extends Map 
{
	/**
	 * 
	 * @param Object options 
	 */
	constructor(options) {
		super(options);

		this._proxyUrl = options.proxy || null;
		this._apiKey   = options.apiKey || null;
	
    	// Valeur de resolution pour un niveau de zoom de valeur 0
    	this._resolutionInit = 156543.03392804097 ;

		// Ajout du layerSwitcher
		this._layerSwitcher = options.layerSwitcher ? options.layerSwitcher : new ol_control_LayerSwitcher({
			collapsed:false,
			// trash: true
		});
		this.addControl(this._layerSwitcher);
			   
		this._gpConfig = new GPConfig();
		if (options.addBaseLayer) {
			if (this._apiKey) this.addGeoportalLayer(this._apiKey, "GEOGRAPHICALGRIDSYSTEMS.MAPS");
			this.addGeoportalLayer("ortho", "ORTHOIMAGERY.ORTHOPHOTOS");
			this.addGeoportalLayer("cartes", "GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2"); 
		}
	   
		// Metadonnees et attribution IGN
		this._metadataIGN = 'https://geoservices.ign.fr/';
		this._attributionIGN = this._getAttribution({ 
			'attribution_name': "Institut national de l'information géographique et forestière",
			'attribution_url' : 'https://www.ign.fr/',
			'attribution_logo_url': 'https://wxs.ign.fr/static/logos/IGN/IGN.gif'
		});
	}

	/**
	 * Ajout d'une couche du Geoportail
 	 * @param {string} key : cartes|ortho ...
 	 * @param {string} layer : ORTHOIMAGERY.ORTHOPHOTOS
     * @param {object} opt_options : visible and opacity
	 * @returns 
	 */
	addGeoportalLayer(key, layer, opt_options) {	
		let options = opt_options || { visible: true, opacity: 1 };
		let visible = ('visible' in options) ? options.visible : true;
		let opacity = ('opacity' in options) ? options.opacity : 1;
		
		let newLayer = new TileLayer({
			name: layer,
			visible: visible,
			opacity: opacity,
			// noSwitcherDelete: true
		});
		this.addLayer(newLayer);
	  
		let url = `https://wxs.ign.fr/${key}/geoportail/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities`;
		if (this._proxyUrl) {
			url = this._proxyUrl + encodeURIComponent(url);
		}
			
		this._gpConfig.getCapabilities(url)
			.then(capabilities => {
				// Mise en place de la source de la couche
				let wmtsOptions = optionsFromCapabilities(capabilities, {
					layer: layer
				});
				if (! wmtsOptions) {
					throw new Error(`Layer [${layer}] does not exist`);
				}
				wmtsOptions['attributions'] = this._attributionIGN;
				wmtsOptions['crossOrigin'] = 'Anonymous';

				let layers = capabilities['Contents']['Layer'];
				const descLayer = layers.find(element => {
					return element['Identifier'] == layer;
				});
	
				// Min et Max et extent
				var bbox = transformExtent(descLayer.WGS84BoundingBox, 'EPSG:4326', 'EPSG:3857');
				
				let matrixIds = wmtsOptions.tileGrid.matrixIds_;
				let minZoom = parseInt(matrixIds[0], 10);
				let maxZoom = parseInt(matrixIds.slice(-1)[0], 10);
	
				newLayer.set('title', descLayer.Title);
				newLayer.setMinResolution(this._getResolutionFromZoom(maxZoom));
				newLayer.setMaxResolution(this._getResolutionFromZoom(minZoom));
				newLayer.setExtent(bbox);
				newLayer.setSource(new WMTS(wmtsOptions));
			}).catch(error => {
				this.removeLayer(newLayer);
				if (error instanceof TypeError)
					console.error(error.message);
				else console.error(error);
			});
			
		return newLayer;
	}

	/**
	 * Ajout d'un layer ripart a la map
	 * Geoportail, WMS, WMTS
	 * @param {Object} layer
	 * @returns {layer}
	 */
	addRipartLayer (layer)	{
		let options = {
			visible: layer.visibility,
			opacity: layer.opacity
		};

		let service = layer[layer.type];
		if (layer.type === 'geoservice') {
			return this.addGeoservice(service, options);
		} else if (layer.type === 'feature-type') {
			return this.addFeatureType(service, options);
		}

		throw 'Must be a ripart layer';
	}

	/**
	 * Ajout d'un geoservice a la map
	 * Geoportail, WMS, WMTS
	 * @param {Object} geoservice
	 * @param {Object} options (visible, opacity)
	 * @returns {layer}
	 */
	addGeoservice(geoservice, options) {
		if (! geoservice) {
			throw 'geoservice must be defined';
		}

		options = options ?? { visible: true, opacity: 1 };
		
		let extent = geoservice.map_extent.split(",");
		extent = extent.map(function (x) {
			return parseInt(x, 10);
		});

		let bbox = transformExtent(extent, 'EPSG:4326', 'EPSG:3857');

		var newLayer = null;
		switch(geoservice.type){
			case 'WMS':	
				newLayer = this._addWMSGeoservice(geoservice, options, bbox);
				break;
			case 'WMTS':
				newLayer = this._addWMTSGeoservice(geoservice, options, bbox);
				break;
			case 'WFS':
				newLayer = this._addWFSGeoservice(geoservice, options, bbox);
				break;
			default : throw "Geoservice type unknown";
		}

		return newLayer;
	}

	/**
	 * Ajout d'une couche vecteur a la map
	 * @param {Object} featureType
	 * @param {Object} opt (visible, opacity, filter ...)
	 * @returns {layer}
	 */
	addFeatureType(featureType, opt, source_options)	{
		let options     = $.extend({ visible: true, opacity: 1 }, opt);
		let src_options = source_options ?? {};
		
		if (featureType.tileZoomLevel) {
			src_options.tileZoom = featureType.tileZoomLevel;
		}
		src_options = $.extend({ featureType: featureType }, src_options);
		
		let style = null;
		if (featureType.style) {
			style = WebpartStyle.getFeatureStyleFn(featureType);	
		} else {
			style = new Style({
				fill: new Fill({ color:[238,153,0,0.5] }),
				stroke: new Stroke({ color:[238,153,0,1], width:2 }),
				image: new Circle({
					radius: 5,
					fill: new Fill({ color:[238,153,0,0.5] }),
					stroke: new Stroke({ color:[238,153,0,1], width:2 })
				})
			});
		}
		
		let Layer = new WebpartLayer({
			name: featureType.name,
			type: 'feature-type',
			'feature-type': featureType,
			visible: options.visible,
			opacity: options.opacity,
			style: style,
			minResolution: this._getResolutionFromZoom(featureType.maxZoomLevel),
			maxResolution: this._getResolutionFromZoom(featureType.minZoomLevel)
		}, src_options);

		var lsOptions = {
			title: featureType.title,
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
		
		this.addLayer(Layer, lsOptions);
		return Layer;
	}

	/**
	 * Ajout d'un geoservice WMS a la map
	 * @param {Object} geoservice
	 * @param {Object} options (visible, opacity)
	 * @returns {layer}
	 */
	_addWMSGeoservice(geoservice, options) {
		let isIGN = new RegExp(/https:\/\/wxs.ign.fr\//).test(geoservice.url);

		let bbox = this._getExtent(geoservice.map_extent);

		let newLayer = new TileLayer({
			name: geoservice.title,
			type:  'geoservice',
			geoservice: geoservice,
			source: new TileWMS({
				url: geoservice.url,
				attributions: this._getAttribution(geoservice),
				params: {
					LAYERS: geoservice.layers,
					FORMAT: geoservice.format,
					VERSION: geoservice.version || '1.3.0'
				}
			}),
			visible: options.visible,
			opacity: options.opacity,
			minResolution: this._getResolutionFromZoom(geoservice.max_zoom),
			maxResolution: this._getResolutionFromZoom(geoservice.min_zoom),
			extent: bbox
		});
		
		let metadata = isIGN ? { url: this._metadataIGN } : { url: geoservice.link };
		this.addLayer(newLayer, {
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
	_addWMTSGeoservice (geoservice, options) {
		let isIGN = new RegExp(/https:\/\/wxs.ign.fr\//).test(geoservice.url);

		let bbox = this._getExtent(geoservice.map_extent);
		let newLayer = new TileLayer({
			name: geoservice.layers,
			type: 'geoservice',
			geoservice: geoservice,
			source: new WMTS({
				"crossOrigin": "Anonymous"
			}),
			visible: options.visible,
			opacity: options.opacity,
			minResolution: this._getResolutionFromZoom(geoservice.max_zoom),
			maxResolution: this._getResolutionFromZoom(geoservice.min_zoom),
			extent: bbox
		});
		
		let metadata = isIGN ? { url: this._metadataIGN } : { url: geoservice.link };
		this.addLayer(newLayer, {
			title: geoservice.title,
			visible: options.visible,
			description: geoservice.description,
			metadata: [metadata]
		});

		// GetCapabilities
		let version = geoservice.version;
		let url = geoservice.url + (new RegExp(/[\?]/g).test(geoservice.url) ? '&' : '?') + `SERVICE=WMTS&VERSION=${version}&REQUEST=GetCapabilities`;
		
		this._gpConfig.getCapabilities(url)
			.then(capabilities => {
				let wmtsOptions = optionsFromCapabilities(capabilities, {
					layer: geoservice.layers,
					matrixSet: 'EPSG:3857'
				});
				if (! wmtsOptions) {
					throw new Error(`Layer [${geoservice.layers}] does not exist`);
				}
	
				wmtsOptions['attributions'] = this._getAttribution(geoservice);
				wmtsOptions['crossOrigin'] = 'Anonymous';
				newLayer.setSource(new WMTS(wmtsOptions));
			}).catch(error => {
				this._removeLayer(newLayer);
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
	_addWFSGeoservice(geoservice, options) {
		let extent = geoservice.map_extent.split(",");
		extent = extent.map(function (x) {
			return parseInt(x, 10);
		});
		
		// Ajout Redmine #7753 (en cours, pourrait nécessiter l'usage du proxy)
		let source = new VectorSource({
			format: new GeoJSON(),
			loader: (extent) => {
				let url = geoservice.url + (new RegExp(/[\?]/g).test(geoservice.url) ? '&' : '?') + 'service=WFS';
				let bbox = extent;
				
				if (geoservice.version == '1.0.0') {
					// BBOX avec 4 paramètres : coordonnées
					// pas de SRSNAME car prend le Default SRS/CRS
					bbox = transformExtent(extent, 'EPSG:3857', 'EPSG:4326').join(',');
					url += '&version=' + geoservice.version + '&request=GetFeature&typeName=' + geoservice.layers + '&outputFormat=' + geoservice.format + '&bbox=' + bbox;
				} else {
					// BBOX avec 5 paramètres : coordonnées et SRS
					if (geoservice.box_srid !== 'EPSG:3857') {
						bbox = transformExtent(extent, 'EPSG:3857', 'EPSG:4326').join(',');
					}
					bbox += ',' + geoservice.box_srid;
					url += '&version=' + geoservice.version + '&request=GetFeature&typeName=' + geoservice.layers +	'&outputFormat=' + geoservice.format + '&srsname=EPSG:3857&bbox=' + bbox;
				}

				if (this._proxyUrl) {
					url = this._proxyUrl + encodeURIComponent(url);
				}

				fetch(url).then(response => {
					if (! response.ok) throw Error("Bad response from server");
					return response.text();
				}).then(response => {
					source.addFeatures (
						source.getFormat().readFeatures(response, {
							featureProjection: 'EPSG:3857'
						})
					);
				});
			},
			attributions: this._getAttribution(geoservice),
			crossOriginKeyword: 'anonymous',
			strategy: bbox_strategy
		});

		let defaultStyle = new Style({
			fill: new Fill({color: "rgba(0, 0, 255, 0.5)"}),
			stroke: new Stroke({
				color: "rgba(0, 0, 255, 1)",
				width: 2
			}),
			image: new Circle({
				radius: 5,
				fill: new Fill({color: "rgba(0, 0, 255, 0.5)"}),
				stroke: new Stroke({
					color: "rgba(0, 0, 255, 1)",
					width: 2
				})
			})
		});

		let newLayer = new VectorLayer({
			name: geoservice.title,
			type: 'geoservice',
			geoservice: geoservice,
			source: source,
			style: defaultStyle,
			visible: options.visible,
			opacity: options.opacity,
			minResolution: this._getResolutionFromZoom(geoservice.max_zoom),
			maxResolution: this._getResolutionFromZoom(geoservice.min_zoom)
		});

		this.addLayer(newLayer, {
			title: geoservice.title,
			visible: options.visible,
			description: geoservice.description,
			metadata: [{ url:geoservice.link }]
		});
	};
		
	/**
	 * @param {type} geoservice
	 * @returns {undefined}
	 */
	_removeGeoservice(layername) {
		var layers = this.getLayersByName(layername);
		$.each(layers, function(index, layer) {
			this.removeLayer(layer);
		});
	};

	/**
	 * @param {string} mapExtent
	 * @returns {ol.Extent}
	 */
	_getExtent(mapExtent) {
		let extent = mapExtent.split(",");
		extent = extent.map(function (x) {
			return parseInt(x, 10);
		});

		let bbox = Utilities.getMaxExtent3857();
		if (! extent_equals(extent, Utilities.getMaxExtent4326())) {
			bbox = transformExtent(extent, 'EPSG:4326', 'EPSG:3857');
		}
		
		return bbox;
	};
		
	_getLayerSwitcher() {
    	return this._layerSwitcher;
	}

	_getLayersByName(name) {
		let mapLayers = this.getLayers().getArray();
		return mapLayers.filter(layer => {
			return layer.get('name') === name;
		});
	}

	_getAttribution(geoservice) {
		let result = null;
		
		let name 	= geoservice.attribution_name;
		let url 	= geoservice.attribution_url;
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
	}

	/**
	 * Retourne la resolution pour un niveau de zoom donne
	 * @param {integer} zoom
	 * @returns {float} resolution
	 */
	_getResolutionFromZoom = function (zoom) {
		return this._resolutionInit / Math.pow(2, zoom) ;
	};
}

export default GeoportalMap;