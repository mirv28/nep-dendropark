const API_URL = "http://192.168.0.102:5000/";
//const API_URL = "http:///172.18.0.1:5000";
//const API_URL = "https://khaki-hoops-sin.loca.lt";
console.log("ADMIN JS LOADED");

async function login(event) {
  event.preventDefault();

  const login = document.getElementById("login").value;
  const password = document.getElementById("password").value;

  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      login,
      password,
    }),
  });

  if (response.ok) {
    document.getElementById("head-adm").style.display = "none";
    document.getElementById("login-form").style.display = "none";
    document.getElementById("admin-panel").style.display = "block";
    loadPlants();
    loadMapPoints();
  } else {
    alert("Неверный логин");
  }
}

document.getElementById("login-form").addEventListener("submit", login);

async function addPlant() {
  const data = {
    name_rus: document.getElementById("name_rus").value,
    name_lat: document.getElementById("name_lat").value,
    country: document.getElementById("country").value,
    height: document.getElementById("height").value
      ? parseInt(document.getElementById("height").value)
      : null,
    year: document.getElementById("year").value
      ? parseInt(document.getElementById("year").value)
      : null,
    leaf_type: document.getElementById("leafType").value,
    description: document.getElementById("description").value,
    fact: document.getElementById("fact").value,
    image: document.getElementById("image").value,
  };
  console.log("Отправляемые данные:", data);

  const response = await fetch(`${API_URL}/admin/plants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (response.ok) {
    alert("Растение добавлено!");
    loadPlants();
    // Очищаем поля формы
    document.getElementById("name_rus").value = "";
    document.getElementById("name_lat").value = "";
    document.getElementById("country").value = "";
    document.getElementById("height").value = "";
    document.getElementById("year").value = "";
    document.getElementById("leafType").value = "";
    document.getElementById("description").value = "";
    document.getElementById("fact").value = "";
    document.getElementById("image").value = "";
  } else {
    alert("Ошибка при добавлении растения");
  }
}

document.getElementById("addPlantBtn").addEventListener("click", addPlant);

async function loadPlants() {
  const response = await fetch(`${API_URL}/admin/plants`, {
    credentials: "include",
  });

  const plants = await response.json();
  if (!Array.isArray(plants)) {
    console.error(plants);
    alert("Ошибка авторизации");
    return;
  }

  const container = document.getElementById("plantsList");
  container.innerHTML = "";

  const select = document.getElementById("plantSelect");
  select.innerHTML = "";

  // Добавляем пустой option
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Выберите растение";
  select.appendChild(emptyOption);

  plants.forEach((plant) => {
    const div = document.createElement("div");
    div.innerHTML = `
      ${plant[1]}
      <button onclick="deletePlant(${plant[0]})">
        Удалить
      </button>
    `;
    container.appendChild(div);

    const option = document.createElement("option");
    option.value = plant[0];
    option.textContent = plant[1];
    select.appendChild(option);
  });
}

async function deletePlant(id) {
  if (!confirm("Удалить это растение и все его точки?")) return;

  const response = await fetch(`${API_URL}/admin/plants/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (response.ok) {
    loadPlants();
    loadMapPoints();
  }
}

var map = new ol.Map({
  target: "map",
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM(),
    }),
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([56.0506595555, 54.7896770556]),
    zoom: 17,
  }),
});

const popupElement = document.getElementById("popup");
const popupOverlay = new ol.Overlay({
  element: popupElement,
  positioning: "bottom-center",
  stopEvent: true,
  offset: [0, -20],
});
map.addOverlay(popupOverlay);

let markerLayer;

async function loadMapPoints() {
  const response = await fetch(`${API_URL}/admin/points`, {
    credentials: "include",
  });
  const data = await response.json();
  drawPoints(data);
}

function drawPoints(data) {
  if (markerLayer) {
    map.removeLayer(markerLayer);
  }

  const features = [];
  data.forEach((item) => {
    const feature = new ol.Feature({
      geometry: new ol.geom.Point(
        ol.proj.fromLonLat([item.longitude, item.latitude]),
      ),
      pointData: item,
    });

    feature.setStyle(
      new ol.style.Style({
        image: new ol.style.Icon({
          src: "images/icons/tree.png",
          scale: 1,
          anchor: [0.5, 1],
        }),
      }),
    );

    features.push(feature);
  });

  markerLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
      features: features,
    }),
  });

  map.addLayer(markerLayer);
}
map.on("singleclick", function (evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature);

  if (!feature) {
    popupOverlay.setPosition(undefined);
    popupElement.style.display = "none";
    return;
  }

  const point = feature.get("pointData");
  if (point) {
    showDeletePopup(point, evt.coordinate);
  }
});

function showDeletePopup(point, coordinate) {
  popupElement.style.display = "block";
  popupElement.innerHTML = `
    <strong>${point.plant_name}</strong>
    <br><br>
    <button id="delete" onclick="deletePoint(${point.point_id})">
      Удалить точку
    </button>
  `;
  popupOverlay.setPosition(coordinate);
}
async function addPoint(plantId, latitude, longitude) {
  console.log("Добавление точки:", { plantId, latitude, longitude });

  try {
    const response = await fetch(`${API_URL}/admin/points`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        plant_id: parseInt(plantId),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      }),
    });

    const result = await response.json();
    console.log("Ответ сервера:", result);

    if (response.ok) {
      loadMapPoints();
      document.getElementById("latitudeInput").value = "";
      document.getElementById("longitudeInput").value = "";
      return true;
    } else {
      alert("Ошибка: " + (result.error || "Неизвестная ошибка"));
      return false;
    }
  } catch (error) {
    console.error("Ошибка при добавлении точки:", error);
    alert("Ошибка при добавлении точки");
    return false;
  }
}
map.on("click", async function (evt) {
  console.log("Клик по карте");
  const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature);
  if (feature) {
    console.log("Кликнули по маркеру, пропускаем");
    return;
  }

  const plantId = document.getElementById("plantSelect").value;
  console.log("Выбранное растение ID:", plantId);

  if (!plantId) {
    alert("Сначала выберите растение в списке!");
    return;
  }

  const coords = ol.proj.toLonLat(evt.coordinate);
  console.log("Координаты клика:", coords);

  await addPoint(plantId, coords[1], coords[0]);
});

document
  .getElementById("addPointByCoordsBtn")
  .addEventListener("click", async function () {
    console.log("Клик по кнопке добавления по координатам");

    const plantId = document.getElementById("plantSelect").value;
    const latInput = document.getElementById("latitudeInput").value.trim();
    const lngInput = document.getElementById("longitudeInput").value.trim();

    console.log("Данные из полей:", { plantId, latInput, lngInput });

    if (!plantId) {
      alert("Выберите растение!");
      return;
    }

    if (!latInput || !lngInput) {
      alert("Введите широту и долготу!");
      return;
    }

    const latitude = parseFloat(latInput);
    const longitude = parseFloat(lngInput);

    if (isNaN(latitude) || isNaN(longitude)) {
      alert("Введите корректные числовые координаты!");
      return;
    }

    if (latitude < -90 || latitude > 90) {
      alert("Широта должна быть в диапазоне от -90 до 90");
      return;
    }

    if (longitude < -180 || longitude > 180) {
      alert("Долгота должна быть в диапазоне от -180 до 180");
      return;
    }

    await addPoint(plantId, latitude, longitude);
  });
async function deletePoint(pointId) {
  if (!confirm("Удалить эту точку?")) return;

  const response = await fetch(`${API_URL}/admin/points/${pointId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (response.ok) {
    popupOverlay.setPosition(undefined);
    popupElement.style.display = "none";
    loadMapPoints();
  } else {
    alert("Ошибка при удалении точки");
  }
}
