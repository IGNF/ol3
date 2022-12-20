import Interaction from 'ol/interaction/Interaction';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import { singleClick } from 'ol/events/condition';
import ol_WMSGetFeatureInfo from 'ol/format/WMSGetFeatureInfo';


class WMSGetFeatureInfo extends Interaction
{
    /**
     * @param {object} opt_options
     * - proxyUrl {string} proxy name
     * - layer {ol.layer.Tile} layer to getFeatureInfo on
     * - infoFormat {string} muste be GML,HTML or JSON
     * - maxFeatures {integer} maxFeatures for GetFeatureInfo request
     * @returns {undefined}
     */
    constructor(opt_options) {
        let options = opt_options?? {};

        if (! options.layer) {
            throw 'layer option must be defined';
        }
        if (! (options.layer instanceof TileLayer)) {
            throw 'layer option must be a TileLayer';    
        }
        if (! (options.layer.getSource() instanceof TileWMS)) {
            throw "layer source must be an instance of 'ol.source.TileWMS'";
        }

        let formats = {
            'GML': 'application/vnd.ogc.gml',
            'HTML': 'text/html',
            'JSON': 'application/json'
        };
        let format = options.infoFormat?? 'GML';
        if (! format in formats) {
            throw "infoFormat option must be either 'GML', 'HTML, 'JSON'";
        }

        super();

        this._proxyUrl 	= options.proxyUrl || '';
        this._layer    	= options.layer;
        this._format    = format;
        this._params = {
            INFO_FORMAT: formats[format],
            FEATURE_COUNT: options.maxFeatures || 10
        };
    }

    handleEvent(mapBrowserEvent) {
        if (! singleClick(mapBrowserEvent)) return true;
	
        let map = mapBrowserEvent.map;
        let coordinate = mapBrowserEvent.coordinate;
        
        let url = this._layer.getSource().getGetFeatureInfoUrl(
            coordinate,
            map.getView().getResolution(),
            map.getView().getProjection(),
            this._params
        );
    
        url = this._proxyUrl + encodeURIComponent(url);
        
        // On change le style de cursor
        let lastCursor = map.getViewport().style.cursor;
        map.getViewport().style.cursor = 'progress';
        
        fetch(url).then(response => {
            map.getViewport().style.cursor = lastCursor;
            let newEvent = {
                type:'getfeatureinfo',
                map: map,
                coordinate: coordinate,
                response: response,
            };

            newEvent['data'] = data; 
            if ('GML' === this._format) {
                let format = new ol_WMSGetFeatureInfo();
                let features = format.readFeatures(data, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: this.getMap().getView().getProjection()
                });
                newEvent['data'] = features;
            }
            this.dispatchEvent(newEvent);
        }).catch(error => {
            map.getViewport().style.cursor = lastCursor;
            this.dispatchEvent({ type:'getfeatureinfofailed', msg: error });
        });

        return false;
    }
}

export default WMSGetFeatureInfo;