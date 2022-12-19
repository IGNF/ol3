import { register } from 'ol/proj/proj4';

function addProjectionsToProj4() {
    /*Ajout de quelques projections supplementaires par rapport à celles incluses dans GpPlugin */
    // Mayotte : RGM04 / UTM zone 38S
    proj4.defs("EPSG:4471","+proj=utm +zone=38 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
    // Reunion : RGR92 / UTM zone 40S
    proj4.defs("EPSG:2975","+proj=utm +zone=40 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
    // Guadeloupe, Martinique ... : RGAF09 / UTM zone 20N
    proj4.defs("EPSG:5490","+proj=utm +zone=20 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
    // Guyane : RGFG95 / UTM zone 22N
    proj4.defs("EPSG:2972","+proj=utm +zone=22 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
    // St-Pierre-et-Miquelon : RGSPM06 / UTM zone 21N
    proj4.defs("EPSG:4467","+proj=utm +zone=21 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
    
    register(proj4);
}

export default addProjectionsToProj4;