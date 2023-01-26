// GeoportalMap
import GeoportalMap from './src/js/ign/ol/GeoportalMap';

// Controls
import Scale from './src/js/ign/ol/control/Scale';
import Locate from './src/js/ign/ol/control/Locate';
import DisplayCenter from './src/js/ign/ol/control/DisplayCenter';

// Interactions
import MeasureInteraction from './src/js/ign/ol/interaction/Measure';
import WMSGetFeatureInfo from './src/js/ign/ol/interaction/WmsGetFeatureInfo';

// Styles
import WebpartStyle from './src/js/ign/ol/style/webpartstyle';

// Divers
import addProjectionsToProj4 from './src/js/ign/proj4_epsg';
import WebpartLayer from './src/js/ign/ol/layer/webpartlayer';

import { Utilities, getResolutionForZoom } from './src/js/ign/Utilities';

export { 
    GeoportalMap, 
    WebpartStyle,
    Scale, 
    Locate, 
    DisplayCenter, 
    MeasureInteraction, 
    WMSGetFeatureInfo,
    addProjectionsToProj4,
    WebpartLayer,
    Utilities,
    getResolutionForZoom,
};