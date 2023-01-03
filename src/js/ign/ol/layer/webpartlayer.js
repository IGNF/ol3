import VectorLayer from 'ol/layer/Vector';
import WebpartSource from './../source/webpartsource';
import WebpartStyle	from './../style/webpartstyle';

class WebpartLayer extends VectorLayer
{
	/** ol.layer.Vector.Webpart
	 * @constructor
	 * @extends {ol.source.Vector}
	 * @trigger ready (when source is ready)
	 * @param options (olx.layer.Vector)
	 * @param source_options (olx.source.WebpartOptions)
	 * @returns {ol.source.Vector.Webpart}
	 */
	constructor(options, source_options) {
		options = options?? {};
		source_options = source_options ?? {};

		if (! ('featureType' in source_options)) {
			throw 'featureType must be defined.';	
		}

		// Webpart source
		source_options.maxResolution = options.maxResolution;
		options.source = new WebpartSource(source_options);
			
		// Style of the feature style
		if (! options.style) {
			options.style = WebpartStyle.getFeatureStyleFn(options.source.getFeatureType());
		}
		
		super(options);
	}

	getFeatureType() {	
		return this.getSource().featureType_;
	}

	getFeatureStyle() {
		return this.getSource().featureType_.style;
	}	
}

export default WebpartLayer;