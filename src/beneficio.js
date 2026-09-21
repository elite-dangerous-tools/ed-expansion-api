const { recuperarBusqueda } = require("./spansh");

const suministroMinimo = 1000;
const beneficioMinimo = 1000;
const diasAntiguedadPrecioMaximo = 7;


async function prepararBusqueda(sistema, distancia, plataforma, planetaria, procesarPagina) {
    const parametros = {
        filters: {
            distance: { min: 0, max: distancia },
            has_market: { value: true }
        },
        sort: [{ distance: { direction: "asc" } }],
        reference_system: sistema
    };

    if (plataforma == "G") {
        parametros.filters.has_large_pad = { value: true };
    } else if (plataforma == "M") {
        parametros.filters.has_large_pad = { value: false };
    }

    if (planetaria == "1" || planetaria == 1) {
        parametros.filters.is_planetary = { value: true };
    } else if (planetaria == "0" || planetaria == 0) {
        parametros.filters.is_planetary = { value: false };
    }

    let respuesta = await recuperarBusqueda(parametros, "stations", procesarPagina);

    return respuesta;
}


function guardarProductoCompraVenta(estacionVender, estacionComprar, productoVender, productoComprar, beneficio, listaGrandesBeneficios) {
    
    listaGrandesBeneficios.push({
        sistemaVender: estacionVender.system_name,
        estacionVender: estacionVender.name,
        distanciaSistema: estacionComprar.distance,
        distanciaEstacion: estacionComprar.distance_to_arrival,

        sistemaComprar: estacionComprar.system_name,
        estacionComprar: estacionComprar.name,

        producto: productoVender.commodity,
        categoria: productoVender.category,

        estacionCompra_precio_compra: productoComprar.buy_price,
        // estacionCompra_precio_venta: productoComprar.sell_price,
        estacionCompra_suministro: productoComprar.supply,

        // estacionVenta_precio_compra: productoVender.buy_price,
        estacionVenta_precio_venta: productoVender.sell_price,
        estacionVenta_demanda: productoVender.demand,

        beneficio: beneficio
    });
    
}

// Índice O(N): commodity -> lista de { estacion, producto } que lo venden.
// Sustituye al .find() lineal dentro de bucles anidados (antes era O(N²): por
// cada producto vendido se recorria el market de TODAS las estaciones
// compradoras; con ~500 estaciones eran millones de comparaciones por petición).
function indexarEstacionesComprar(estacionesComprar) {
    const indice = new Map();

    estacionesComprar.forEach(estacionComprar => {
        estacionComprar.market.forEach(productoComprar => {
            let candidatos = indice.get(productoComprar.commodity);
            if (!candidatos) {
                candidatos = [];
                indice.set(productoComprar.commodity, candidatos);
            }
            candidatos.push({ estacion: estacionComprar, producto: productoComprar });
        });
    });

    return indice;
}

function comprobarCompras(estacionVender, productoVender, candidatosCompra, listaGrandesBeneficios) {
    candidatosCompra.forEach(candidato => {
        const estacionComprar = candidato.estacion;
        const productoComprar = candidato.producto;

        let beneficio = productoVender.sell_price - productoComprar.buy_price;
        if (beneficio >= beneficioMinimo && productoComprar.supply >= suministroMinimo) {
            guardarProductoCompraVenta(estacionVender, estacionComprar, productoVender, productoComprar, beneficio, listaGrandesBeneficios);
        }
    });
}

function comprobarVenta(estacionVender, productoVender, indiceCompras, listaGrandesBeneficios) {
    if (productoVender.category == "Minerals") {
        return;
    }
    if (productoVender.category == "Metals") { // No está claro si esto es correcto
        return;
    }

    // Lookup O(1) por commodity en vez de recorrer todas las estaciones
    const candidatosCompra = indiceCompras.get(productoVender.commodity);
    if (candidatosCompra) {
        comprobarCompras(estacionVender, productoVender, candidatosCompra, listaGrandesBeneficios);
    }
}

function comprobarMercado(estacionVender, indiceCompras, listaGrandesBeneficios) {
    estacionVender.market.forEach(productoVender => {
        comprobarVenta(estacionVender, productoVender, indiceCompras, listaGrandesBeneficios);
    });
}

function comprobarVentas(estacionesVender, indiceCompras, listaGrandesBeneficios) {
    estacionesVender.forEach(estacionVender => {
        comprobarMercado(estacionVender, indiceCompras, listaGrandesBeneficios);
    });
}

exports.beneficio = async (req, res) => {
    try {
        const { sistema, distancia, plataforma, planetaria } = req.query;

        // La distancia debe ser un número entre 0 y 50 al (mismo límite que el
        // front). Excluye no numéricos, negativos y NaN.
        // Endpoint de desarrollo sin terminar.
        const distanciaNumero = Number(distancia);
        if (!Number.isFinite(distanciaNumero) || distanciaNumero < 0 || distanciaNumero > 50) {
            return res.status(400).json({
                "error": "La distancia debe ser un número entre 0 y 50"
            });
        }

        const ahora = new Date();

        // Adelgazamos y filtramos cada página nada más recibirla, antes de
        // pedir la siguiente (antes se acumulaban las 5 páginas enteras en RAM)
        const procesarPagina = (resultados) => {
            let estacionesPagina = [];

            resultados.forEach(estacion => {
                if (!estacion) {
                    return;
                }
                if (estacion.type && estacion.type.includes("Construction Depot")) {
                    return;
                }
                if (estacion.name && estacion.name.includes("Colonisation Ship")) {
                    return;
                }
                if (estacion.type && estacion.type == "Settlement" && (planetaria == "0" || planetaria == 0)) {
                    return;
                }
                if (estacion.carrier_docking_access !== undefined) {
                    return;
                }
                if (!estacion.market || estacion.market.length === 0) {
                    return;
                }

                // console.log(estacion.name, estacion.system_name, estacion.distance_to_arrival, estacion.distance);
                let fecha_actualizacion = new Date(estacion.updated_at);
                let diferenciaEnMilisegundos = ahora.getTime() - fecha_actualizacion.getTime();

                const segundos = Math.floor(diferenciaEnMilisegundos / 1000);
                const minutos = Math.floor(segundos / 60);
                const horas = Math.floor(minutos / 60);
                const dias = Math.floor(horas / 24);

                if (dias > diasAntiguedadPrecioMaximo) {
                    return;
                }

                delete estacion.import_commodities;
                delete estacion.export_commodities;

                delete estacion.economies;
                delete estacion.services;
                delete estacion.ships;
                delete estacion.modules;

                if (estacion.distance === 0) {
                    // Sistema de búsqueda, solo queremos los productos que la estacion compra
                    estacion.market = estacion.market.filter(p => p.demand > 0 && p.sell_price > 1);
                } else if (estacion.distance > 0) {
                    // Sistema cercano, solo queremos los productos que la estacion vende
                    estacion.market = estacion.market.filter(p => p.supply > 0 && p.buy_price > 1);
                }

                estacionesPagina.push(estacion);
            });

            return estacionesPagina;
        };

        let respuesta = await prepararBusqueda(sistema, distanciaNumero, plataforma, planetaria, procesarPagina);
        if (!respuesta) {
            return res.json({
                "error": "No se han encontrado estaciones"
            });
        }

        // Separamos: en el sistema de referencia (distance 0) solo interesan los
        // productos que compra la estación; en los cercanos, los que vende
        let estacionesVender = [];
        let estacionesComprar = [];

        respuesta.forEach(estacion => {
            if (estacion.distance === 0) {
                estacionesVender.push(estacion);
            } else if (estacion.distance > 0) {
                estacionesComprar.push(estacion);
            }
        });

        let listaGrandesBeneficios = [];
        const indiceCompras = indexarEstacionesComprar(estacionesComprar);
        comprobarVentas(estacionesVender, indiceCompras, listaGrandesBeneficios);

        listaGrandesBeneficios.sort((a, b) => {
            if (a.beneficio > b.beneficio) {
                return -1;
            } else if (a.beneficio < b.beneficio) {
                return 1;
            }

            return 0;
        });

        let primerosCien = listaGrandesBeneficios.slice(0, 100);

        res.json(primerosCien);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Fallo crítico al buscar estaciones con el producto" });
    }
};
