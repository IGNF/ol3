ol = ol || {};

/**
 * @constructor IGN's Geoportail Map definition
 * @extends {ol.Map}
 * @param options {ol.Map.options}
 * @returns {ol.Map.Geoportail}
 */
ol.Map.Geoportail = function(opt_options) {
    var options = opt_options ? opt_options : {};
    
    ol.Map.call(this, options);
    
    //valeur de resolution pour un niveau de zoom de valeur 0
    this._resolutionInit = 156543.03392804097 ;

    // Ajout du layerSwitcher
    this._layerSwitcher = new ol.control.LayerSwitcher({options: {collapsed:false}});
    this.addControl(this._layerSwitcher);

    // Ajout des layers par defaut
    if (! options.addBaseLayer) {
        return;
    }
    
    this.addLayer(
        new ol.layer.GeoportalWMTS({
            layer: 'GEOGRAPHICALGRIDSYSTEMS.MAPS',
            olParams: {
                name: 'GEOGRAPHICALGRIDSYSTEMS.MAPS'
            }
        })
    );
    this.addLayer(
        new ol.layer.GeoportalWMTS({
            layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
            olParams: {
                name: 'ORTHOIMAGERY.ORTHOPHOTOS',
                opacity: 0.5
            }
        })
    );
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
	var options = {visible: layer.visibility, opacity: layer.opacity};
    switch(layer.type) {
        case 'geoservice':
            return this.addGeoservice(layer.geoservice, options);
        case 'feature-type':
            return this.addFeatureType(layer.feature_type, options);
    }
};

/**
 * Ajout d'un geoservice a la map
 * Geoportail, WMS, WMTS
 * @param {type} geoservice
 * @param {Object} opt (visible, opacity)
 * @returns {layer}
 */
ol.Map.Geoportail.prototype.addGeoservice = function (geoservice, options)
{
    if ( ! geoservice) {
        return null;
    }
    if( !options ){
        var options = {visible: true, opacity: 1};        
    }
    
    var extent = geoservice.map_extent.split(",");
    extent = extent.map(function (x) { 
        return parseInt(x, 10); 
    });
    
    var bbox = ol.proj.transformExtent(extent, 'EPSG:4326', 'EPSG:3857');
    
    switch(geoservice.type){
        case 'GeoPortail':
            var GPLayer = new ol.layer.GeoportalWMTS({
                layer: geoservice.title,
                olParams: {
                    name: geoservice.title,
                    visible: options.visible,
                    opacity: options.opacity,
                    minResolution: this.getResolutionFromZoom(geoservice.max_zoom),
                    maxResolution: this.getResolutionFromZoom(geoservice.min_zoom),
                    extent: bbox,
                    useInterimTilesOnError: false
                }
            });
            
            this.addLayer(GPLayer);
            this.getLayerSwitcher().setRemovable(GPLayer,false);
            this.updateEyeInLayerSwitcher(GPLayer, options.visible);
            return GPLayer;
            
        case 'WMS':
            var wmsLayer = new ol.layer.Tile({
                name: geoservice.title,
                source: new ol.source.TileWMS({
                    url: geoservice.url,
                    attributions: [new ol.Attribution({
                    html: geoservice.description
                })],
                    params: {
                        LAYERS: geoservice.layers,
                        FORMAT: geoservice.format
                      },
                    projection: 'EPSG:4326'
                }),
                visible: options.visible,
		opacity: options.opacity,
                minResolution: this.getResolutionFromZoom(geoservice.max_zoom),
                maxResolution: this.getResolutionFromZoom(geoservice.min_zoom),
                extent: bbox
            });
            this.addLayer(wmsLayer);
              
            // Mise a jour de la couche dans le layer switcher                 
            this.getLayerSwitcher().addLayer(wmsLayer, {
				title:geoservice.title, 
				description: geoservice.description,
				quicklookUrl : null,
				legends: [],
				metadata: [{url:geoservice.link}]
			});        
            this.getLayerSwitcher().setRemovable(wmsLayer,false);
            this.updateEyeInLayerSwitcher(wmsLayer, options.visible);    
            return wmsLayer;
			
        case 'WMTS':
            var wmtsLayer = null;
            
            var parser = new ol.format.WMTSCapabilities();
            var map = this;
            $.ajax({
                url: geoservice.url+"?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities",
                type: "GET"
			}).done(function(response){
                // Ajout de la couche a la carte
                var wmtsCap = parser.read(response);
                
                // ol3 veut les epsg en uppercase !!!!
                // TODO SUPPRIMER APRES LA CORRECTION DANS L'EAS
                var matrixSets = [];
                $.each(wmtsCap['Contents']['TileMatrixSet'], function(index, matrixSet) {
                    var ms = matrixSet;
                    ms['SupportedCRS'] = ms['SupportedCRS'].toUpperCase();
                    matrixSets.push(ms);
                });
                wmtsCap['Contents']['TileMatrixSet'] = matrixSets;
                //
                
                var wmtsOptions = ol.source.WMTS.optionsFromCapabilities(wmtsCap, {
                    layer: geoservice.layers, 
                    matrixSet: 'epsg:3857',
                    title: geoservice.title
		});
                wmtsLayer = new ol.layer.Tile({
                    name: geoservice.title,
                    source: new ol.source.WMTS(wmtsOptions),
                    attribution:[new ol.Attribution({html: 'Some copyright info.'})],
                    visible: options.visible,
                    opacity: options.opacity,
                    minResolution: map.getResolutionFromZoom(geoservice.max_zoom),
                    maxResolution: map.getResolutionFromZoom(geoservice.min_zoom),
                    extent: bbox
                });    
                map.addLayer(wmtsLayer); 
                
                // Mise a jour de la couche dans le layer switcher                 
                map.getLayerSwitcher().addLayer(wmtsLayer, {
					title:geoservice.title, 
					description: geoservice.description,
					quicklookUrl : null,
					legends: [],
					metadata: [{url:geoservice.link}]
				});        
                map.getLayerSwitcher().setRemovable(wmtsLayer,false);
                map.updateEyeInLayerSwitcher(wmtsLayer,options.visible);
            }).fail(function(error){
                console.log('erreur getCapabilities wmts');
            });
            return wmtsLayer;
        default : return null;   
    }  
};

/**
 * Ajout d'une couche vecteur a la map
 * @param {type} feature
 * @param {Object} opt (visible, opacity, filter ...)
 * @returns {layer}
 */
ol.Map.prototype.addFeatureType = function (featureType, opt, source_options)
{
	var options     = $.extend({visible:true, opacity: 1}, opt);
	var src_options = source_options || {};
    src_options = $.extend({featureType: featureType}, src_options);
    
    // VERIFIER QUE CA MARCHE ...
    var vectorLayer = new ol.layer.Vector.Webpart({  
        name: featureType.name,
        visible: options.visible,
	opacity: options.opacity,
        minResolution: this.getResolutionFromZoom(featureType.maxZoomLevel),
        maxResolution: this.getResolutionFromZoom(featureType.minZoomLevel)
    },src_options);            
    
    this.addLayer(vectorLayer);
    
    this.getLayerSwitcher().addLayer(vectorLayer, {
        title:featureType.name
    });
    
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
