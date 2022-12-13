import GPConfig from './GPConfig';
import Map from 'ol-6.9.0/Map';
import TileLayer from 'ol-6.9.0/layer/Tile';
import WMTS from 'ol-6.9.0/source/WMTS';
import { optionsFromCapabilities } from 'ol-6.9.0/source/WMTS';
import { transformExtent } from 'ol-6.9.0/proj';
import { ol_control_LayerSwitcher as LayerSwitcher }  from "ol-ext/control/LayerSwitcher";


export class ol_Map_Geoportail extends Map 
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
		this._layerSwitcher = options.layerSwitcher ? options.layerSwitcher : new LayerSwitcher({options: {collapsed:false}});
		this.addControl(this._layerSwitcher);
			   
		this._gpConfig = new GPConfig();
		if (options.addBaseLayer) {
			if (this._apiKey) this.addGeoportalLayer(this._apiKey, "GEOGRAPHICALGRIDSYSTEMS.MAPS");
			this.addGeoportalLayer("ortho", "ORTHOIMAGERY.ORTHOPHOTOS");
			this.addGeoportalLayer("cartes", "GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2"); 
		}
	   
		// Metadonnees et attribution IGN
		let attribution = this._getAttribution({ 
			'attribution_name': "Institut national de l'information géographique et forestière",
			'attribution_url' : 'https://www.ign.fr/',
			'attribution_logo_url': 'https://wxs.ign.fr/static/logos/IGN/IGN.gif'
	
		});
		this._metadataIGN = 'https://geoservices.ign.fr/';
		this._attributionIGN = new ol.Attribution({ html: attribution });
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
		let visible = options.visible || true;
		let opacity = options.opacity || 1;
		
		let newLayer = new TileLayer({
			name: layer,
			visible: visible,
			opacity: opacity
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
				
				let layers = capabilities['Contents']['Layer'];
				const descLayer = layers.find(element => {
					return element['Identifier'] == layer;
				});
	
				// Min et Max et extent
				var bbox = transformExtent(descLayer.WGS84BoundingBox, 'EPSG:4326', 'EPSG:3857');
				
				let matrixIds = wmtsOptions.tileGrid.matrixIds_;
				let minZoom = parseInt(matrixIds[0], 10);
				let maxZoom = parseInt(matrixIds.slice(-1)[0], 10);
	
				newLayer.setMinResolution(_self.getResolutionFromZoom(maxZoom));
				newLayer.setMaxResolution(_self.getResolutionFromZoom(minZoom));
				newLayer.setExtent(bbox);
				wmtsOptions['crossOrigin'] = 'Anonymous';
				newLayer.setSource(newWMTS(wmtsOptions));
				
				// Mise a jour de la couche dans le layer switcher
				this.getLayerSwitcher().addLayer(newLayer, {
					title: descLayer.Title,
					description: descLayer.Abstract,
					metadata: [{ url: this._metadataIGN }]
				});
				this.getLayerSwitcher().setRemovable(newLayer, false);
				this._updateEyeInLayerSwitcher(newLayer, options.visible);
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
	}
}