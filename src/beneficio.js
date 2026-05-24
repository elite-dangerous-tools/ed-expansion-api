const suministroMinimo = 1000;
const beneficioMinimo = 1000;

async function llamadaBusqueda(sistema, distancia, plataforma, planetaria, pagina = 0) {
    const parametros = {
        filters: {
            distance: { min: 0, max: distancia },
            has_market: { value: true }
        },
        sort: [{ distance: { direction: "asc" } }],
        size: 500,
        page: pagina,
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

    let response = await fetch("https://spansh.co.uk/api/stations/search/", {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(parametros)
    });

    let respuesta = await response.json();

    return respuesta;
}

async function recuperarBusqueda(sistema, distancia, plataforma, planetaria) {
    let repetir = true;
    let pagina = 0;

    let respuestas = [];

    while (repetir) {
        let peticion = await llamadaBusqueda(sistema, distancia, plataforma, planetaria, pagina);

        if (peticion.count > 500 && peticion.results.length == 500) {
            repetir = true;
            pagina++;
        } else {
            repetir = false;
        }

        respuestas = respuestas.concat(peticion.results);
    }

    return respuestas;
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
        estacionVenta_suministro: productoVender.demand,

        beneficio: beneficio
    });
    
}

function comprobarCompras(estacionVender, productoVender, estacionComprar, listaGrandesBeneficios) {
    let productoComprar = estacionComprar.market.find(pc => pc.commodity == productoVender.commodity);
    if (!productoComprar) {
        return;
    }

    let beneficio = productoVender.sell_price - productoComprar.buy_price;
    if (beneficio >= beneficioMinimo && productoComprar.supply >= suministroMinimo) {
        guardarProductoCompraVenta(estacionVender, estacionComprar, productoVender, productoComprar, beneficio, listaGrandesBeneficios);
    }
}

function comprobarVenta(estacionVender, productoVender, estacionesComprar, listaGrandesBeneficios) {
    if (productoVender.category == "Minerals") {
        return;
    }

    estacionesComprar.forEach(estacionComprar => {
        comprobarCompras(estacionVender, productoVender, estacionComprar, listaGrandesBeneficios);
    });
}

function comprobarMercado(estacionVender, estacionesComprar, listaGrandesBeneficios) {
    estacionVender.market.forEach(productoVender => {
        comprobarVenta(estacionVender, productoVender, estacionesComprar, listaGrandesBeneficios);
    });
}

function comprobarVentas(estacionesVender, estacionesComprar, listaGrandesBeneficios) {
    estacionesVender.forEach(estacionVender => {
        comprobarMercado(estacionVender, estacionesComprar, listaGrandesBeneficios);
    });
}

exports.beneficio = async (req, res) => {
    try {
        const { sistema, distancia, plataforma, planetaria } = req.query;
        // http://localhost:5000/api/beneficio?sistema=Arietis%20Sector%20PN-T%20b3-2&distancia=10&planetaria=0&plataforma=G

        if (distancia > 150) {
            // No permitimos tanta distancia
            res.json([]);
            return;
        }

        let respuesta = await recuperarBusqueda(sistema, distancia, plataforma, planetaria);

        let estacionesVender = [];
        let estacionesComprar = [];

        const ahora = new Date();

        respuesta.forEach(estacion => {
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

            let fecha_actualizacion = new Date(estacion.updated_at);
            let diferenciaEnMilisegundos = ahora.getTime() - fecha_actualizacion.getTime();

            const segundos = Math.floor(diferenciaEnMilisegundos / 1000);
            const minutos = Math.floor(segundos / 60);
            const horas = Math.floor(minutos / 60);
            const dias = Math.floor(horas / 24);

            if (dias > 7) {
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

                estacionesVender.push(estacion);
            } else if (estacion.distance > 0) {
                // Sistema cercano, solo queremos los productos que la estacion vende
                estacion.market = estacion.market.filter(p => p.supply > 0 && p.buy_price > 1);

                estacionesComprar.push(estacion);
            }
        });

        let listaGrandesBeneficios = [];
        comprobarVentas(estacionesVender, estacionesComprar, listaGrandesBeneficios);

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
        console.log(error);
        res.json({ message: "Fallo crítico al buscar estaciones con el producto" });
    }
};
