// Machine Learning Clasificación — ml-clasificacion.html
// Lee data/ml_clasificacion.json y renderiza tablas, matrices, curvas ROC y cartas.
// Usa leerJSON() y mostrarError() de js/common.js.

document.addEventListener('DOMContentLoaded', function () {
  // Cargar datos desde data/
  leerJSON('data/ml_clasificacion.json', function (err, datos) {
    if (err) {
      mostrarError('Error al cargar los datos de clasificación', err);
      return;
    }

    // --- Dictamen arriba ---
    const dictamen = document.getElementById('dictamen-clasificacion-titulo');
    if (dictamen) {
      dictamen.textContent = 'Modelo elegido: ' + datos.mejor;
    }

    // --- Tabla comparativa de modelos ---
    const cuerpoModelos = document.getElementById('cuerpo-modelos-clasificacion');
    if (cuerpoModelos) {
      const modelos = datos.modelos;
      modelos.forEach(function (m) {
        const tr = document.createElement('tr');
        const baseClass = m.es_base ? ' es-base' : '';
        tr.innerHTML = `
          <td>${m.modelo}</td>
          <td>${m.exactitud.toFixed(5)}</td>
          <td>${m.exactitud_balanceada.toFixed(5)}</td>
          <td>${m.precision_sin_oleo.toFixed(5)}</td>
          <td>${m.sensibilidad_sin_oleo.toFixed(5)}</td>
          <td>${m.f1_sin_oleo.toFixed(5)}</td>
          <td>${m.especificidad_con_oleo.toFixed(5)}</td>
          <td>${m.auc_roc !== null ? m.auc_roc.toFixed(4) : '—'}</td>
          <td>${m.auc_pr !== null ? m.auc_pr.toFixed(4) : '—'}</td>
          <td>${m.umbral !== null ? m.umbral.toFixed(2) : '—'}</td>
          <td><span class="marca ${baseClass ? 'base' : ''}">${m.es_base ? 'base' : ''}</span></td>
          <td><span class="marca ${!m.es_base ? 'elegido' : ''}">${!m.es_base ? 'elegido' : ''}</span></td>
        `;
        cuerpoModelos.appendChild(tr);
      });
    }

    // --- Matrices de confusión ---
    const cuerpoMatrizBase = document.getElementById('cuerpo-matriz-base');
    const cuerpoMatrizGB = document.getElementById('cuerpo-matriz-gb');
    if (datos.matrices_confusion) {
      // Base (Persistencia)
      if (cuerpoMatrizBase) {
        const m = datos.matrices_confusion['Persistencia (modelo base)'];
        const tr1 = document.createElement('tr');
        const tr2 = document.createElement('tr');
        tr1.innerHTML = `<td>Con óleo</td><td>${m[0][0]}</td><td>${m[0][1]}</td>`;
        tr2.innerHTML = `<td>Sin óleo</td><td>${m[1][0]}</td><td>${m[1][1]}</td>`;
        cuerpoMatrizBase.appendChild(tr1);
        cuerpoMatrizBase.appendChild(tr2);
      }

      // Gradient Boosting
      if (cuerpoMatrizGB) {
        const m = datos.matrices_confusion['Red neuronal (MLP)'];
        // Nota: el JSON dice "Red neuronal (MLP)" pero el encabezado dice "Gradient Boosting"
        // Usaremos el nombre correcto del JSON
        const tr1 = document.createElement('tr');
        const tr2 = document.createElement('tr');
        tr1.innerHTML = `<td>Con óleo</td><td>${m[0][0]}</td><td>${m[0][1]}</td>`;
        tr2.innerHTML = `<td>Sin óleo</td><td>${m[1][0]}</td><td>${m[1][1]}</td>`;
        cuerpoMatrizGB.appendChild(tr1);
        cuerpoMatrizGB.appendChild(tr2);
      }
    }

    // --- Pozos que dejan de producir ---
    const cuerpoPozos = document.getElementById('cuerpo-pozos-dejan');
    if (cuerpoPozos && datos.pozos_que_dejan_de_producir) {
      const modelos = Object.keys(datos.pozos_que_dejan_de_producir);
      modelos.forEach(function (modelo) {
        const m = datos.pozos_que_dejan_de_producir[modelo];
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${modelo}</td>
          <td>${m.pozos_que_dejan_de_producir}</td>
          <td>${m.detectados}</td>
          <td>${(m.proporcion_detectada * 100).toFixed(1)}%</td>
        `;
        cuerpoPozos.appendChild(tr);
      });
    }

    // --- Curvas ROC ---
    const cuerpoCurvas = document.getElementById('cuerpo-curvas-roc');
    if (cuerpoCurvas && datos.curvas_roc) {
      const modelos = Object.keys(datos.curvas_roc);
      modelos.forEach(function (modelo) {
        const m = datos.curvas_roc[modelo];
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${modelo}</td>
          <td>${m.auc_roc !== null ? m.auc_roc.toFixed(4) : '—'}</td>
          <td>${m.auc_pr !== null ? m.auc_pr.toFixed(4) : '—'}</td>
        `;
        cuerpoCurvas.appendChild(tr);
      });
    }

    // --- Importancia por permutación ---
    const cuerpoImp = document.getElementById('cuerpo-importancia-clasificacion');
    if (cuerpoImp && datos.importancia) {
      datos.importancia.forEach(function (v) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${v.variable}</td><td class="numero">${v.importancia.toFixed(4)}</td><td class="numero">${v.desviacion.toFixed(6)}</td>`;
        cuerpoImp.appendChild(tr);
      });
    }

    // Quitar estado "Cargando…"
    const loading = document.querySelectorAll('.status');
    loading.forEach(function (el) { el.style.display = 'none'; });
  });
});

// Asegurar que el enlace "Machine Learning" quede activo en esta página
document.querySelectorAll('.sidebar-link').forEach(function (link) {
  if (link.getAttribute('href') === 'ml-regresion.html' || link.getAttribute('href') === 'ml-clasificacion.html') {
    link.classList.add('is-active');
    link.setAttribute('aria-current', 'page');
  }
});