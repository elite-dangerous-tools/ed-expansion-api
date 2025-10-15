
const { descargar_estaciones } = require('../src/descargar_estaciones');

let req = undefined;
let res = undefined;
let cron = true;
descargar_estaciones(req, res, cron);
