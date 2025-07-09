ol.proj.setProj4(proj4);
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
// 7079: RGTAAF07 / UTM zone 42S (Iles Kerguelen)
proj4.defs("EPSG:7079","+proj=utm +zone=42 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
// 7076: RGTAAF07 / UTM zone 39S (Ile Crozet)
proj4.defs("EPSG:7076","+proj=utm +zone=39 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
// 7074: RGTAAF07 / UTM zone 37S (Ile Europa)
proj4.defs("EPSG:7074","+proj=utm +zone=37 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
// 7080: RGTAAF07 / UTM zone 43S (Iles St-Paul et Amsterdam)
proj4.defs("EPSG:7080","+proj=utm +zone=43 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
// 8455: RGTAAF07 / UTM zone 53S (Terre Adélie et Ile des Pétrels)
proj4.defs("EPSG:8455","+proj=utm +zone=53 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
