var listTerritories =
    {   "FXX": { lon:1.7, lat:46.95, ech:5, bbox: [-16.82294921875, 37.19502456685295, 20.222949218750003, 55.203734032646594] },
        "GLP": { lon:-61.42, lat:16.17, ech:9, bbox: [-62.57768432617188, 15.377060580206361, -60.26231567382814, 16.95977023145332] },
        "GUF": { lon:-53, lat:4.8, ech:8, bbox: [-55.31536865234374, 3.156078098640947, -50.68463134765625, 6.439970953751896] },
        "MTQ": { lon:-61, lat:14.65, ech:10, bbox: [-61.578842163085945, 14.251047449405135, -60.421157836914055, 15.04822768949532] },
        "MYT": { lon:45.13, lat:-12.82, ech:11, bbox:[44.84057891845704, -13.020778127142378, 45.41942108154297, -12.619061638722968] },
        "NCL": { lon:165.9, lat:-21.2, ech:8, bbox: [161.2692626953125, -24.239669753584337, 170.53073730468748, -18.096482567466012] },
        "PYF": { lon:-149.5, lat:-17.66, ech:10, bbox: [-150.07884216308594, -18.052140861060508, -148.9211578369141, -17.26700280808282] },
        "REU": { lon:55.53, lat:-21.13, ech:10, bbox: [54.95115783691405, -21.513786808590666, 56.10884216308593, -20.74521710539878] },
        "SPM": { lon:-56.3,  lat:46.94,  ech:10, bbox: [-56.87884216308594, 46.65797089542582, -55.72115783691406, 47.22055130644134] },
        "WLF": { lon:-176.2, lat:-13.285,ech:12, bbox: [-176.34471054077147, -13.385219782637407, -176.0552894592285, -13.184738809337162] },
        "ATF": { lon:140, lat:-66.7, ech:9, bbox: [139.99, -66.8, 140.1, -66.6] },
        "KER": { lon:69.7, lat:-49.25,  ech:8, bbox:[67.38463134765627, -50.31401860644216, 72.01536865234375, -48.16254495202611] },
        "CRZ": { lon:51.28, lat:-46.35,  ech:8, bbox:[48.964631347656244, -47.47567139483367, 53.595368652343744, -45.20065867477615] },
        "SMA": { lon:-63.08, lat:18.07,  ech:12, bbox: [-63.224710540771476, 17.97205589937103, -62.93528945922851, 18.16788950346654] },
        "SBA": { lon:-62.85, lat:17.91, ech:12, bbox:[-62.9947105407715, 17.811967276654542, -62.705289459228524, 18.00797854458071] },
        "ANF": { lon:-64.34, lat:15.78, ech:6, bbox: [-64.40, 15.70, -64.30, 15.80] },
        "EUE": { lon:9.4, lat:48.94, ech:2, bbox: [9.3, 48.9, 9.5, 49.0] }
    };
    
/**
 * @constructor IGN's Geoportail Map definition
 * @extends {ol.Map}
 * @param options {ol.Map.options}
 * @returns {ol.Map.Geoportail}
 */
ol.Map.Geoportail = function(opt_options) {
    var options = opt_options ? opt_options : {};
    
    ol.Map.call(this, options);
    
    this.proxyUrl_ = null;
    
    // Valeur de resolution pour un niveau de zoom de valeur 0
    this._resolutionInit    = 156543.03392804097 ;
    this._territory         = 'FXX';
    
    // Ajout du layerSwitcher
    this._layerSwitcher = new ol.control.LayerSwitcher({options: {collapsed:false}});
    this.addControl(this._layerSwitcher);

    // Ajout des layers par defaut
    if (options.addBaseLayer) {
        this.addLayer(new ol.layer.GeoportalWMTS({
            layer: 'GEOGRAPHICALGRIDSYSTEMS.MAPS',
            olParams: {
                name: 'GEOGRAPHICALGRIDSYSTEMS.MAPS'
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
 * 
 * @param {string} url
 * @returns {undefined}
 */
ol.Map.Geoportail.prototype.setProxyUrl = function(url)
{
    this.proxyUrl_ = url;
};


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
 * 
 * @returns {String}
 */
ol.Map.Geoportail.prototype.getTerritory = function()
{
    return this._territory;
};

/**
 * 
 * @param {String} zone
 * @returns {undefined}
 */
ol.Map.Geoportail.prototype.setTerritory = function(zone)
{
    this._territory = zone;
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
    
    if (layer.type === 'geoservice') {
        return this.addGeoservice(layer.geoservice, options);
    } else if (layer.type === 'feature-type') {        
        return this.addFeatureType(layer.feature_type, options);
    }
    
    throw 'Must be a ripart layer';
};

/**
 * Ajout d'un geoservice a la map
 * Geoportail, WMS, WMTS
 * @param {Object} geoservice
 * @param {Object} opt (visible, opacity)
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
    
    var extent = geoservice.map_extent.split(",");
    extent = extent.map(function (x) { 
        return parseInt(x, 10); 
    });
    
    var bbox = ol.proj.transformExtent(extent, 'EPSG:4326', 'EPSG:3857');
    
	var newLayer = null;
    switch(geoservice.type){
        case 'GeoPortail':
			newLayer = new ol.layer.GeoportalWMTS({
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
            
            newLayer.set('type', 'geoservice');
            newLayer.set('geoservice', geoservice);
            this.addLayer(newLayer);
					
			this.getLayerSwitcher().setRemovable(newLayer,false);
			this.updateEyeInLayerSwitcher(newLayer, options.visible);
            break;
            
        case 'WMS':
            newLayer = new ol.layer.Tile({
                name: geoservice.title,
                source: new ol.source.TileWMS({
                    url: geoservice.url,
                    attributions: [new ol.Attribution({
                        html: geoservice.description
                    })],
                    params: {
                        LAYERS: geoservice.layers,
                        FORMAT: geoservice.format,
                        VERSION: geoservice.version || '1.3.0'
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
				title:geoservice.title, 
				description: geoservice.description,
				quicklookUrl : null,
				legends: [],
				metadata: [{url:geoservice.link}]
			});        
            this.getLayerSwitcher().setRemovable(newLayer,false);
            this.updateEyeInLayerSwitcher(newLayer, options.visible);    
            break;
			
        case 'WMTS':
			newLayer = new ol.layer.Tile({
                name: geoservice.title,
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
            var url = geoservice.url + "?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities";
            if (this.proxyUrl_) {
                url = this.proxyUrl_ + encodeURIComponent(url);
            }

            var parser = new ol.format.WMTSCapabilities();

            $.ajax({
                url: url,
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
ol.Map.prototype.addFeatureType = function (featureType, opt, source_options)
{    
 	var options     = $.extend({visible:true, opacity: 1}, opt);
	var src_options = source_options || {};
    src_options = $.extend({featureType: featureType}, src_options);
  
    var vectorLayer = new ol.layer.Vector.Webpart({  
        name: featureType.name,
        visible: options.visible,
        opacity: options.opacity,
        minResolution: this.getResolutionFromZoom(featureType.maxZoomLevel),
        maxResolution: this.getResolutionFromZoom(featureType.minZoomLevel)
    },src_options);            
    
    vectorLayer.set('type', 'feature-type');
    vectorLayer.set('feature-type', featureType);
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



    // Centre des cartes en fonction du territoires
ol.Map.Geoportail.prototype.Geocentre = function(zone)
{   
    var c = listTerritories[zone];
    if (!c) {
        c = {   
            lon : gc['FXX']['lon'],
            lat : gc['FXX']['lat'],
            ech : 8
        };
    }
    return c;
};

/**
 * 
 * @param {ol.Coordinate} coordinate
 * @returns {String}
 */
ol.Map.Geoportail.prototype.getTerritoryFromCoords = function(coordinate)
{
    for(var terr in listTerritories){
        var territory = ol.extent.containsCoordinate(listTerritories[terr].bbox, coordinate);
        if(territory){
            return terr;
        }
    };    
    return 'FXX';
    
};

/**
 * Mise a jour de la carte apres un changement de territoire par la liste deroulante du formulaire
 * @param {ol.Map.Geportail} map
 * @param {string} zone
 * @returns {undefined}
 */
function setTerritory(map, zone){
    var c = map.Geocentre(zone);
    map.getView().setCenter(ol.proj.transform([c.lon,c.lat], 'EPSG:4326', 'EPSG:3857'));
    map.getView().setZoom(c.ech);
    
    //si on a une couche georem, on centre la punaise sur la nouvelle zone
    var layerGeorem = map.getLayersByName('georem')[0];
    if(layerGeorem){
        layerGeorem.getSource().getFeatures()[0].setGeometry(new ol.geom.Point(ol.proj.transform([c.lon,c.lat], 'EPSG:4326', 'EPSG:3857')));
    }
};