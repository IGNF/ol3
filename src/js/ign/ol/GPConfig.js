import WMTSTileGrid from 'ol/tilegrid/WMTS';
import { optionsFromCapabilities } from 'ol/source/WMTS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import { transformExtent } from 'ol/proj';


/**
 * Gestion des GetCapabilities
 */
class GPConfig 
{
	constructor() {
		this._capabilities = {};
		// @TODO: patch provisoire: cette classe est à réécrire quand on saura comment vont fonctionner les geoservices prives
		this._privateLayers = [
			"GEOGRAPHICALGRIDSYSTEMS.MAPS",
			"GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI",
			"GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR"
		];
	}

	async getCapabilities(url) {
		if (url in this._capabilities) {
			return this._capabilities[url];
		}
	
		let response = await fetch(url);
		if (! response.ok)
			throw new Error(`Bad response from server : ${response.status}`);

		let caps = await response.text();
		let format = new WMTSCapabilities();
		let capabilities = format.read(caps);
		if (! capabilities)
			throw new Error("Reading capabilities failed");

		this._capabilities[url] = capabilities;
		return capabilities;	
	}
} 

/**
 * Creation d'un couche a partir d'un GetCapabilities
 * @param {Object} capabilities 
 * @param {String} layer 
 */
const getWMTSLayerOptionsFromCapabilities = (capabilities, layer) => {
	let options = optionsFromCapabilities(capabilities, {
        layer: layer
    });
    
	if (! options) {
        throw new Error(`Layer [${layer}] does not exist`);
    }

    const layerInfo = capabilities['Contents']['Layer'].find(element => {
        return element['Identifier'] === layer;
    });

    let wmtsSourceOptions = {};
    wmtsSourceOptions.layer         = layerInfo.Identifier;
    wmtsSourceOptions.version       = capabilities.version;
    wmtsSourceOptions.urls          = options.urls;
    wmtsSourceOptions.matrixSet     = options.matrixSet;
    wmtsSourceOptions.projection    = options.projection.getCode();
    wmtsSourceOptions.tileGrid      = new WMTSTileGrid({
        resolutions: options.tileGrid.getResolutions(),
        matrixIds: options.tileGrid.getMatrixIds(),
        origins: options.tileGrid.origins_
    });
    wmtsSourceOptions.format        = options.format;
    wmtsSourceOptions.style         = options.style;
    wmtsSourceOptions.crossOrigin   = "anonymous";

	let extent = transformExtent(layerInfo.WGS84BoundingBox, "EPSG:4326", "EPSG:3857");

	return {
		wmtsSourceOptions: wmtsSourceOptions,
		layerOptions: {
			title: layerInfo.Title ?? layerInfo.Identifier,
        	description: layerInfo.Abstract ?? layerInfo.Identifier,
        	extent: extent
		}
	}
}

export { GPConfig, getWMTSLayerOptionsFromCapabilities };