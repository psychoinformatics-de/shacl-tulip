# `shacl-tulip`

Like "shacl-vue-lib".

This is the main library behind [`shacl-vue`](https://github.com/psychoinformatics-de/shacl-vue).

## Usage

Clone the source code:

```
git clone https://github.com/psychoinformatics-de/shacl-tulip.git
```

Install the library into your virtual environment and project:

```
npm install --save <path>
```

Import and use `shacl-tulip` in your JavaScript code, for example

```javascript
import { ShapesDataset} from 'shacl-tulip'

let shapesDS = new ShapesDataset();
const fileUrl = 'https://concepts.datalad.org/s/things/v1.shacl.ttl';
await shapesDS.loadRDF(fileUrl);

console.log(shapesDS.propertyGroups)
console.log(shapesDS.nodeShapes)
console.log(shapesDS.nodeShapeNames)
console.log(shapesDS.nodeShapeNamesArray)
console.log(shapesDS.nodeShapeIRIs)
console.log(shapesDS.prefixes)
console.log(shapesDS.serializedGraph)
console.log(shapesDS.graphLoaded)
console.log(shapesDS.prefixesLoaded)
console.log(shapesDS.graph)
console.log(shapesDS.graph.size)

```

[See here](src/index.js) for all `shacl-tulip` exports, and inspect the [class code](src/classes) for class-specific functionality.