/** ol.layer.Vector.Webpart
 * @constructor
 * @extends {ol.source.Vector}
 * @trigger ready (when source is ready)
 * @param options (olx.layer.Vector)
 * @param source_options (olx.source.WebpartOptions)
 * @returns {ol.source.Vector.Webpart}
 */
ol.layer.Vector.Webpart  = function(options, source_options) 
{  
	if (!options) options = {};
	if (!source_options) source_options = {};
	
	if (source_options.featureType === undefined) {
		throw 'featureType must be defined.';
	}
	
	// Webpart source
    source_options.maxResolution = options.maxResolution;
    options.source = new ol.source.Vector.Webpart(source_options);
    	
    // Style of the feature style
	if (!options.style && ol.layer.Vector.Webpart.Style) {
        options.style = ol.layer.Vector.Webpart.Style.getFeatureStyleFn(options.source.getFeatureType());
    }
    
	ol.layer.Vector.call(this, options);
};
ol.inherits(ol.layer.Vector.Webpart, ol.layer.Vector);


/** FeatureType of the layer
*/
ol.layer.Vector.Webpart.prototype.getFeatureType = function()
{	return this.getSource().featureType_;
};

/** FeatureType style of the layer
*/
ol.layer.Vector.Webpart.prototype.getFeatureStyle = function()
{	return this.getSource().featureType_.style;
};