ign/ol3
=======

Composants pour l'affichage des couches pseudo WFS, des croquis ripart ... en OpenLayers >= 3 (**v4.6.5 depuis janvier 2019**)

## Installation

Dans le .npmrc global (dans le dossier utilisateur sur windows) ou dans celui du projet ajouter les lignes suivantes, en remplaçant avec votre token:

@ign-mut:registry=https://gitlab.gpf-tech.ign.fr/api/v4/packages/npm/

//gitlab.gpf-tech.ign.fr/api/v4/packages/npm/:_authToken=MON_TOKEN

//gitlab.gpf-tech.ign.fr/api/v4/projects/:_authToken=MON_TOKEN

puis:

<pre>
npm add @ign-mut/ol3
</pre>

## Créer ou mettre à jour la dépendance mongoparser

```
npm install -g browserify
npm install mongo-parse
cd node_modules/mongo-parse/
browserify mongoParse.js -o mongo_parser.js
```
Créer un parsemongo.js avec : 
```
window.mongoparser = require('mongo-parse')
browserify parsemongo.js -o mongo_parser.js
```

puis :
```
cp mongo_parser.js ../../src/js/style/
```

Comment l'utiliser : https://github.com/fresheneesz/mongo-parse et https://github.com/browserify/browserify
