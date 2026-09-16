async function solicitarFiltro(parametros, tipo) {
    let response = await fetch("https://spansh.co.uk/api/" + tipo + "/search/save", {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        method: "POST",
        body: JSON.stringify(parametros)
    });

    let respuesta = await response.json();

    return respuesta.search_reference;
}

async function recuperarFiltro(busqueda, tipo) {
    let response = await fetch("https://spansh.co.uk/api/" + tipo + "/search/recall/" + busqueda, {
        method: "GET"
    });

    let respuesta = await response.json();

    return respuesta.results;
}

// Si spansh no responde en 15s, mejor fallar rápido (el handler devuelve el
// error) que dejar la petición colgada consumiendo memoria del contenedor.
const TIMEOUT_PETICION_MS = 15000;

const paginacion = 500;
const maximoPaginas = 5;

async function llamadaBusqueda(parametros, tipo) {
    let response;

    try {
        response = await fetch("https://spansh.co.uk/api/" + tipo + "/search/", {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            method: "POST",
            body: JSON.stringify(parametros),
            signal: AbortSignal.timeout(TIMEOUT_PETICION_MS)
        });
    } catch (error) {
        // AbortSignal.timeout lanza TimeoutError; otros fallos de red también caen aquí
        console.error("Fallo de red llamando a spansh (" + tipo + "):", error.message);
        return null;
    }

    if (response.status !== 200) {
        // Solo logueamos lo útil, no el objeto Response entero
        console.error("spansh respondió HTTP " + response.status + " en " + tipo);
        return null;
    }

    return await response.json();
}

// parametros: filtros de búsqueda. tipo: "stations"|"systems"|...
// procesarPagina (opcional): función que recibe los resultados crudos de una
// página y devuelve los ya adelgazados/filtrados. Si se pasa, se aplica NADA
// MÁS recibir la página y ANTES de pedir la siguiente: así el pico de RAM es
// "una página cruda" en vez de "todas las páginas crudas", y lo acumulado
// es solo lo que nos interesa.
async function recuperarBusqueda(parametros, tipo, procesarPagina) {
    let repetir = true;
    parametros.page = 0;
    parametros.size = paginacion;

    let respuestas = [];
    while (repetir) {
        let peticion = await llamadaBusqueda(parametros, tipo);

        // Antes un fallo de spansh petaba en peticion.count.
        // Si falla cualquier página, devolvemos null y el handler responde error
        if (!peticion || !Array.isArray(peticion.results)) {
            return null;
        }

        if (peticion.count > paginacion && peticion.results.length == paginacion && parametros.page < maximoPaginas) {
            repetir = true;
            parametros.page++;
        } else {
            repetir = false;
        }

        let pagina = peticion.results;
        if (typeof procesarPagina === "function") {
            pagina = procesarPagina(pagina);
        }

        respuestas = respuestas.concat(pagina);
    }

    return respuestas;
}

module.exports = {
    solicitarFiltro: solicitarFiltro,
    recuperarFiltro: recuperarFiltro,
    recuperarBusqueda: recuperarBusqueda
};
