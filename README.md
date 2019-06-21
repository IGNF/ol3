ign/ol3
=======

Composants pour l'affichage des couches pseudo WFS, des croquis ripart ... en OL3

## Créer la dépendance mangoparser

npm install -g browserify
npm install mongo-parse
cd node_modules/mongo-parse/
browserify mongoParser.js -o mango_parser.js

Créer un parsemango.js avec : window.mongoparser = require('mongo-parse')
browserify parsemongo.js -o mango_parser.js


puis cp mango_parser.js ../../src/js/style/

Comment l'utiliser : https://github.com/fresheneesz/mongo-parse et https://github.com/browserify/browserify
