// =======================
// ОБРАЗОВАТЕЛЬНЫЙ МАРШРУТ
// =======================

let currentRouteStep = 0;

let routeLayer;
let routePointLayer;
let yearOverlays = [];

const routeStartPoint =
  // ВХОД
  {
    id: 0,

    title: "Начало маршрута",

    coords: [56.045811, 54.790506],

    status: "active",

    card: {
      image: "images/route/start.jpg",

      title: "Образовательный маршрут",

      text: `
        Маршрут начинается со входа
        со стороны улицы Даута Юлтыя.
      `,

      look: `
        В начале маршрута обратите внимание
        на структуру посадок вдоль дорожек.
      `,
      go: `
        На тропинку справа от этого входа. Когда дойдете. Нажмите на кнопку "Далее"
      `,
    },

    pathToNext: [
      [56.045811, 54.790506],
      [56.045876, 54.790409],
    ],
  };
let educationalRoute = [];

// ЗАПУСК МАРШРУТА
function loadRoute(routeId) {
  fetch(`http://127.0.0.1:5000/route/${routeId}`)
    .then((res) => res.json())

    .then((data) => {
      // преобразуем точки из БД
      const dbPoints = data.map((item) => {
        return {
          id: item.id,
          title: item.title,
          coords: [item.longitude, item.latitude],
          status: "locked",
          year: item.year,
          card: {
            image: item.image,
            title: item.title,
            text: item.short_info,
            history: item.history_info,
            look: item.look_around,
            go: item.next_hint,
          },
          pathToNext: item.path_to_next || [],
        };
      });

      // стартовая точка + точки из БД
      educationalRoute = [routeStartPoint, ...dbPoints];

      // первая точка маршрута активна
      if (educationalRoute.length > 0) {
        educationalRoute[0].status = "active";
      }

      startEducationalRoute();
    });
}
function startEducationalRoute() {
  // скрыть список растений
  document.getElementById("plants-list").style.display = "none";

  renderRoute();
  renderRouteCard();
}

// ОТРИСОВКА
function renderRoute() {
  // удалить старые слои
  if (routeLayer) {
    map.removeLayer(routeLayer);
  }

  if (routePointLayer) {
    map.removeLayer(routePointLayer);
  }
  // удалить старые year popup
  yearOverlays.forEach((overlay) => {
    map.removeOverlay(overlay);
  });

  yearOverlays = [];
  let lineFeatures = [];
  let pointFeatures = [];

  educationalRoute.forEach((step, index) => {
    // ЛИНИИ
    if (step.pathToNext.length > 0) {
      let line = new ol.Feature({
        geometry: new ol.geom.LineString(
          step.pathToNext.map((coord) => ol.proj.fromLonLat(coord)),
        ),
      });

      let lineColor = "orange";
      let lineWidth = 4;

      if (step.status === "completed") {
        lineColor = "yellow";
        lineWidth = 8;
      }

      line.setStyle(
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: lineColor,
            width: lineWidth,
          }),
        }),
      );

      lineFeatures.push(line);
    }
    // ТОЧКИ
    let icon = "images/icons/route_locked.png";

    if (step.status === "completed") {
      icon = "images/icons/check_green.png";
    }

    if (step.status === "current") {
      icon = "images/icons/current.png";
    }

    if (step.status === "active") {
      icon = "images/icons/check.png";
    }

    let pointFeature = new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat(step.coords)),

      routeStep: step,
    });

    pointFeature.setStyle(
      new ol.style.Style({
        image: new ol.style.Icon({
          src: icon,
          scale: 1,
          anchor: [0.5, 0.5],
        }),
      }),
    );

    pointFeatures.push(pointFeature);
    // POPUP ГОДА
    if (step.status === "locked" && step.year) {
      const yearElement = document.createElement("div");

      yearElement.className = "year-popup";

      yearElement.innerHTML = `
    <strong>${step.year}</strong>
  `;

      const yearOverlay = new ol.Overlay({
        element: yearElement,

        positioning: "bottom-center",

        offset: [0, -20],

        stopEvent: false,
      });

      yearOverlay.setPosition(ol.proj.fromLonLat(step.coords));

      map.addOverlay(yearOverlay);

      yearOverlays.push(yearOverlay);
    }
  });

  // линии
  routeLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
      features: lineFeatures,
    }),
  });

  map.addLayer(routeLayer);

  // точки
  routePointLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
      features: pointFeatures,
    }),
  });

  map.addLayer(routePointLayer);
}

// -----------------------
// ЛЕВАЯ КАРТОЧКА
// -----------------------

function renderRouteCard() {
  const detail = document.getElementById("plant-detail");

  detail.classList.remove("hidden");

  let step = educationalRoute[currentRouteStep];

  detail.innerHTML = `
  
    <img src="${step.card.image}" style="width:100%; aspect-ratio: 1 / 1;
    object-fit: cover;border-radius:10px;">

    <h2>${step.card.title}</h2>

    <p>${step.card.text}</p>

    <p>${step.card.history || ""}</p>

    <h3>Оглянитесь!</h3>

    <p>${step.card.look || ""}</p>
    <h3>Идите:</h3>
    <p>${step.card.go}</p>
    <button class=route-btn onclick="nextRouteStep()">
      Далее
    </button>
  `;
}

// -----------------------
// СЛЕДУЮЩИЙ ШАГ
// -----------------------

function nextRouteStep() {
  educationalRoute[currentRouteStep].status = "completed";

  currentRouteStep++;

  // конец маршрута
  if (currentRouteStep >= educationalRoute.length) {
    const detail = document.getElementById("plant-detail");

    detail.innerHTML = `
      <h2>Маршрут завершён</h2>

      <p>
        Вы прошли образовательный маршрут.
      </p>
    `;

    renderRoute();

    return;
  }

  educationalRoute[currentRouteStep].status = "active";

  renderRoute();

  renderRouteCard();
}

// -----------------------
// КНОПКА СТАРТА
// -----------------------

document
  .getElementById("startRouteBtn")
  .addEventListener("click", toggleRoutePanel);
document.getElementById("oldTreesRouteBtn").addEventListener("click", () => {
  loadRoute(1);
});
