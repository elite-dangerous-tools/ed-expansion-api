async function solicitarFiltro(sistema, distancia, tipo) {
    const parametros = {
        filters: { distance: { min: 0, max: distancia } },
        // sort: [],
        size: 500,
        page: 0,
        reference_system: sistema
    };

    let response = await fetch("https://spansh.co.uk/api/" + tipo + "/search/save", {
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

async function recuperarFiltro(busqueda, tipo) {
    let response = await fetch("https://spansh.co.uk/api/" + tipo + "/search/recall/" + busqueda, {
        method: "GET",
        mode: "no-cors"
    });

    let respuesta = await response.json();

    if (respuesta.count > 500) {
        // Hay que recuperar las siguientes páginas
    }

    return respuesta.results;
}


async function recuperarBusqueda(sistema, distancia, tipo) {
    const parametros = {
        filters: { distance: { min: 0, max: distancia } },
        // sort: [],
        size: 500,
        page: 0,
        reference_system: sistema
    };

    let response = await fetch("https://spansh.co.uk/api/" + tipo + "/search/", {
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

exports.sistemas_alcance = async (req, res) => {
    try {
        const { distancia, sistema } = req.query;

        if (distancia > 100) {
            // No permitimos tanta distancia
            res.json([]);
            return;
        }

        let resultadoSistemas = await recuperarBusqueda(sistema, distancia, 'systems');
        let resultadoCuerpos = await recuperarBusqueda(sistema, distancia, 'bodies');
        
        resultadoSistemas.forEach(sistema => {
            delete sistema.synthesis_recipes;
            delete sistema.power_conflicts;
            delete sistema.stations;
            delete sistema.minor_faction_presences;

            let cuerpos = resultadoCuerpos.filter(c => c.system_id64 == sistema.id64);
            cuerpos.forEach(cuerpo => {
                delete cuerpo.materials;
                delete cuerpo.parents;
                delete cuerpo.synthesis_recipes;
            });

            delete sistema.bodies; // No tienen tanta información
            sistema.bodies = cuerpos;
        });

        res.json(resultadoSistemas);
    } catch (error) {
        console.log(error);
        res.json({ message: "Fallo crítico al buscar sistemas al alcance" });
    }
};
