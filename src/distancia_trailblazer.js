async function solicitarFiltro(sistema) {
    const parametros = {
        filters: { name: { value: "Trailblazer" }, type: { value: ["Planetary Outpost", "Mega ship"] } },
        sort: [{ distance: { direction: "asc" } }],
        size: 100,
        page: 0,
        reference_system: sistema
    };

    let response = await fetch("https://spansh.co.uk/api/stations/search/save", {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(parametros)
    });

    let respuesta = await response.json();

    return respuesta.search_reference;
}

async function recuperarFiltro(busqueda) {
    let response = await fetch("https://spansh.co.uk/api/stations/search/recall/" + busqueda, {
        method: "GET",
        mode: "no-cors"
    });

    let respuesta = await response.json();

    return respuesta.results;
}

async function recuperarBusqueda(sistema) {
    const parametros = {
        filters: { name: { value: "Trailblazer" }, type: { value: ["Planetary Outpost", "Mega ship"] } },
        sort: [{ distance: { direction: "asc" } }],
        size: 100,
        page: 0,
        reference_system: sistema
    };

    let response = await fetch("https://spansh.co.uk/api/stations/search/", {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(parametros)
    });

    let respuesta = await response.json();

    return respuesta.results;
}

exports.distancia_trailblazer = async (req, res) => {
    try {
        const { sistema } = req.query;

        let resultado = await recuperarBusqueda(sistema);

        let lista_trailblazers = [];

        resultado.forEach(fila => {
            lista_trailblazers.push({
                sistema: fila.system_name,
                estacion: fila.name,
                distanciaestacion: fila.distance_to_arrival,
                distanciasistema: fila.distance
            });
        });

        res.json(lista_trailblazers);
    } catch (error) {
        console.log(error);
        res.json({ message: "Fallo crítico al buscar Trailblazers" });
    }
};
