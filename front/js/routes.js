// =======================
// ОБРАЗОВАТЕЛЬНЫЙ МАРШРУТ
// =======================

let currentRouteStep = 0;
let routeLayer;
let routePointLayer;
let yearOverlays = [];
let userMarkerLayer;
let gpsMode = false;

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
  //fetch(`http://127.0.0.1:5000/route/${routeId}`)
  fetch(`${API_URL}/route/${routeId}`)
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
  startGPS();
}

//геолокация
function startGPS() {
  console.log("GPS START");
  navigator.geolocation.watchPosition(
    (position) => {
      console.log("POSITION", position);
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      updateUserMarker(lat, lon);

      checkRouteDistance(lat, lon);
    },

    (error) => {
      console.log(error);
      console.log("GPS ERROR", error);
    },

    {
      enableHighAccuracy: true,
    },
  );
}
function updateUserMarker(lat, lon) {
  if (userMarkerLayer) {
    map.removeLayer(userMarkerLayer);
  }

  const feature = new ol.Feature({
    geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
  });

  feature.setStyle(
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: 8,

        fill: new ol.style.Fill({
          color: "#2196f3",
        }),

        stroke: new ol.style.Stroke({
          color: "white",
          width: 3,
        }),
      }),
    }),
  );

  userMarkerLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
      features: [feature],
    }),
  });

  map.addLayer(userMarkerLayer);
}

// расчет расстояния
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;

  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
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
  
    <img src="${step.card.image}" class="route-card-image">

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
