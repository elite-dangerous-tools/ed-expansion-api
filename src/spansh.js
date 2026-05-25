async function solicitarFiltro(parametros, tipo) {
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

    return respuesta.results;
}

const paginacion = 500;
const maximoPaginas = 5;

async function llamadaBusqueda(parametros, tipo) {
    let response = await fetch("https://spansh.co.uk/api/" + tipo + "/search/", {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(parametros)
    });

    if (response.status === 200) {
        let respuesta = await response.json();
        return respuesta;
    } else {
        console.error(response);
    }

    return null;
}

async function recuperarBusqueda(parametros, tipo) {
    let repetir = true;
    parametros.page = 0;
    parametros.size = paginacion;

    let respuestas = [];
    while (repetir) {
        let peticion = await llamadaBusqueda(parametros, tipo);

        if (peticion.count > paginacion && peticion.results.length == paginacion && parametros.page < maximoPaginas) {
            repetir = true;
            parametros.page++;
        } else {
            repetir = false;
        }

        respuestas = respuestas.concat(peticion.results);
    }

    return respuestas;
}

module.exports = {
    solicitarFiltro: solicitarFiltro,
    recuperarFiltro: recuperarFiltro,
    recuperarBusqueda: recuperarBusqueda
};
