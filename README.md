# `shacl-tulip`

Like "shacl-vue-lib".

This is the main library behind [`shacl-vue`](https://github.com/psychoinformatics-de/shacl-vue).

## Usage

### Install from `npm`

```
npm install shacl-tulip
```


### Install from latest source code

Clone the source code:

```
git clone https://github.com/psychoinformatics-de/shacl-tulip.git <path>
```

Install the library into your virtual environment and project:

```
npm install --save <path>
```

### Using `shacl-tulip`

Import and use `shacl-tulip` in your JavaScript code, for example:

```javascript
import { ShapesDataset} from 'shacl-tulip'

let shapesDS = new ShapesDataset();
const fileUrl = 'https://concepts.datalad.org/s/things/v1.shacl.ttl';
// Listen for and act on the 'graphLoaded' event
shapesDS.addEventListener('graphLoaded', (event) => {
    console.log('Shapes graph fully loaded:', event.detail)
    console.log(shapesDS.data.propertyGroups)
    console.log(shapesDS.data.nodeShapes)
    console.log(shapesDS.data.nodeShapeNames)
    console.log(shapesDS.data.nodeShapeNamesArray)
    console.log(shapesDS.data.nodeShapeIRIs)
    console.log(shapesDS.data.prefixes)
    console.log(shapesDS.data.serializedGraph)
    console.log(shapesDS.data.graphLoaded)
    console.log(shapesDS.data.prefixesLoaded)
    console.log(shapesDS.data.graph)
    console.log(shapesDS.data.graph.size)
});
// Load the RDF
shapesDS.loadRDF(fileUrl);
```

[See here](src/index.js) for all `shacl-tulip` exports, and inspect the [class code](src/classes) for class-specific functionality.

## Acknowledgements

This work was funded, in part, by

- Deutsche Forschungsgemeinschaft (DFG, German Research Foundation) under grant TRR 379 (546006540, Q02 project)
- Deutsche Forschungsgemeinschaft (DFG, German Research Foundation) under grant SFB 1451 (431549029, INF project)
- MKW-NRW: Ministerium für Kultur und Wissenschaft des Landes Nordrhein-Westfalen under the Kooperationsplattformen 2022 program, grant number: KP22-106A