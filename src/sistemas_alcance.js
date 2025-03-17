// const fs = require('fs');
// const JSONStream = require('JSONStream');

// const rutaSistemas = "./assets/systems.json";

// function distanciaSistema(sistemaOrigen, sistemaNuevo) {
//     const x1 = sistemaOrigen.c.x;
//     const y1 = sistemaOrigen.c.y;
//     const z1 = sistemaOrigen.c.z;

//     const x2 = sistemaNuevo.c.x;
//     const y2 = sistemaNuevo.c.y;
//     const z2 = sistemaNuevo.c.z;

//     const d = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2) * 1.0);
//     return d;
// }

// function devolverSistemas(sistemasBurbuja, nombreSistema, req, res) {
//     let sistemaOrigen = sistemasBurbuja.find(fila => fila.n.toLocaleLowerCase() === nombreSistema.toLocaleLowerCase());

//     let sistemasValidos = [];
//     sistemasBurbuja.forEach(sistema => {
//         let anyosLuz = distanciaSistema(sistemaOrigen, sistema);

//         if (anyosLuz <= radio) {
//             sistemasValidos.push({
//                 name: sistema.n,
//                 distance: anyosLuz
//             });
//         }
//     });

//     res.json(sistemasValidos);
// }

// async function recuperarSistemasAlcance(radio, nombreSistema, req, res) {
//     const sistemasBurbuja = [];

//     const stream = fs.createReadStream(rutaSistemas, { encoding: 'utf8' });
//     const parser = JSONStream.parse('*'); // Procesa cada objeto del JSON

//     stream.pipe(parser);

//     parser.on('data', (sistema) => {
//         sistemasBurbuja.push(sistema);
//     });

//     parser.on('end', () => {
//         console.log('Lectura completa.');
//         devolverSistemas(sistemasBurbuja, nombreSistema, req, res)
//     });

//     parser.on('error', (err) => {
//         console.error('Error al procesar el JSON:', err);
//     });

// }

// exports.sistemas_alcance = async (req, res) => {
//     try {
//         const { distancia, sistema } = req.query;

//         recuperarSistemasAlcance(parseInt(distancia), sistema, req, res);
//         // res.json(sistemasAlcance);
//     } catch (error) {
//         console.log(error);
//         res.json({ message: "Fallo crítico al buscar sistemas al alcance" });
//     }
// };
