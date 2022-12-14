import WMTSCapabilities from 'ol/format/WMTSCapabilities';

/**
 * Gestion des GetCapabilities
 */
class GPConfig 
{
	constructor() {
		this._capabilities = {};
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

export default GPConfig;