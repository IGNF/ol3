import GPConfig from './GPConfig';
import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import WMTS from 'ol/source/WMTS';
import { transformExtent } from 'ol/proj';
import { optionsFromCapabilities } from 'ol/source/WMTS';
import ol_control_LayerSwitcher from "ol-ext/control/LayerSwitcher";


class ol_Map_Geoportail extends Map 
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

	getLayerSwitcher() {
    	return this._layerSwitcher;
	}

	getLayersByName(name) {
		let mapLayers = this.getLayers().getArray();
		return mapLayers.filter(layer => {
			return layer.get('name') === name;
		});
	}

	/**
	 * Mise a jour des de l'oeil barre ou non dans le layerswitcher apres avoir ajoute la couche dans la map
	 * @param {ol.layer} olLayer
	 * @param {bool} visibility
	 * @returns {undefined}
	 */
	_updateEyeInLayerSwitcher(olLayer, visibility){
		var idlayer = this.getLayerSwitcher().getLayerDOMId(olLayer);

		var n = idlayer.indexOf('_');
		var id = idlayer.substr(n + 1);
		document.getElementById(`GPvisibility_${id}`).checked = visibility;
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
	_getResolutionFromZoom = function (zoom){
		return this._resolutionInit / Math.pow(2,zoom) ;
	};

}

export default ol_Map_Geoportail;