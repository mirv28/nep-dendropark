const API_URL = "http://127.0.0.1:5000";
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

// РЕДАКТИРОВАНИЕ РАСТЕНИЯ
async function editPlant(id) {
  console.log("Редактирование растения ID:", id);

  try {
    const response = await fetch(`${API_URL}/admin/plants/${id}`, {
      credentials: "include",
    });

    if (!response.ok) {
      alert("Ошибка загрузки данных растения");
      return;
    }

    const plant = await response.json();
    console.log("Данные растения:", plant);

    // Заполняем поля формы
    document.getElementById("editPlantId").value = plant.id;
    document.getElementById("name_rus").value = plant.name_rus || "";
    document.getElementById("name_lat").value = plant.name_lat || "";
    document.getElementById("country").value = plant.country || "";
    document.getElementById("height").value = plant.height || "";
    document.getElementById("year").value = plant.year || "";
    document.getElementById("leafType").value = plant.leaf_type || "";
    document.getElementById("description").value = plant.description || "";
    document.getElementById("fact").value = plant.fact || "";
    document.getElementById("image").value = plant.image || "";

    // Меняем интерфейс
    document.getElementById("formTitle").textContent = "Редактировать растение";
    document.getElementById("addPlantBtn").style.display = "none";
    document.getElementById("updatePlantBtn").style.display = "block";
    document.getElementById("cancelEditBtn").style.display = "inline-block";

    // Прокручиваем к форме
    document.querySelector(".left-col").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Ошибка:", error);
    alert("Ошибка загрузки данных растения");
  }
}

// Отмена редактирования
document.getElementById("cancelEditBtn").addEventListener("click", function () {
  cancelEdit();
});

function cancelEdit() {
  document.getElementById("editPlantId").value = "";
  document.getElementById("formTitle").textContent = "Добавить растение";
  document.getElementById("addPlantBtn").style.display = "block";
  document.getElementById("updatePlantBtn").style.display = "none";
  document.getElementById("cancelEditBtn").style.display = "none";

  // Очищаем поля
  document.getElementById("name_rus").value = "";
  document.getElementById("name_lat").value = "";
  document.getElementById("country").value = "";
  document.getElementById("height").value = "";
  document.getElementById("year").value = "";
  document.getElementById("leafType").value = "";
  document.getElementById("description").value = "";
  document.getElementById("fact").value = "";
  document.getElementById("image").value = "";
}

// Обновление растения
document
  .getElementById("updatePlantBtn")
  .addEventListener("click", async function () {
    const plantId = document.getElementById("editPlantId").value;

    if (!plantId) {
      alert("Ошибка: ID растения не найден");
      return;
    }

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

    console.log("Обновление растения ID", plantId, "данные:", data);

    try {
      const response = await fetch(`${API_URL}/admin/plants/${plantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        alert("Растение обновлено!");
        cancelEdit();
        loadPlants();
      } else {
        const error = await response.json();
        alert("Ошибка: " + (error.error || "Неизвестная ошибка"));
      }
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Ошибка при обновлении растения");
    }
  });

// ДОБАВЛЕНИЕ РАСТЕНИЯ
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
    //alert("Растение добавлено!");
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
    loadPlants();
  } else {
    const error = await response.json();
    alert("Ошибка: " + (error.error || "Неизвестная ошибка"));
  }
}

document.getElementById("addPlantBtn").addEventListener("click", addPlant);

// ЗАГРУЗКА СПИСКА РАСТЕНИЙ
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

    // Создаем контейнер для названия и кнопок
    const nameSpan = document.createElement("span");
    nameSpan.className = "plant-name";
    nameSpan.textContent = plant[1];

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "plant-actions";

    // Кнопка редактирования
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "✎";
    editBtn.title = "Редактировать";
    editBtn.onclick = function (e) {
      e.stopPropagation();
      editPlant(plant[0]);
    };

    // Кнопка удаления
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Удалить";
    deleteBtn.onclick = function (e) {
      e.stopPropagation();
      deletePlant(plant[0]);
    };

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);

    div.appendChild(nameSpan);
    div.appendChild(actionsDiv);

    // Клик по строке для редактирования
    div.style.cursor = "pointer";
    div.onclick = function () {
      editPlant(plant[0]);
    };

    container.appendChild(div);

    const option = document.createElement("option");
    option.value = plant[0];
    option.textContent = plant[1];
    select.appendChild(option);
  });
}

// УДАЛЕНИЕ РАСТЕНИЯ
async function deletePlant(id) {
  if (!confirm("Удалить это растение и все его точки?")) return;

  const response = await fetch(`${API_URL}/admin/plants/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (response.ok) {
    // Если редактировали это растение - отменяем редактирование
    if (document.getElementById("editPlantId").value == id) {
      cancelEdit();
    }
    loadPlants();
    loadMapPoints();
  } else {
    alert("Ошибка при удалении растения");
  }
}

// КАРТА И ТОЧКИ
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

// Обработчик клика по маркеру (для удаления)
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

// Функция добавления точки
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
      alert("Точка добавлена!");
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

// Обработчик клика по карте
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

// Добавление по координатам из полей ввода
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

// Удаление точки
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
    //alert("Точка удалена!");
  } else {
    alert("Ошибка при удалении точки");
  }
}

// Выход
document
  .getElementById("logoutBtn")
  .addEventListener("click", async function () {
    await fetch(`${API_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });

    document.getElementById("admin-panel").style.display = "none";
    document.getElementById("login-form").style.display = "block";
    document.getElementById("login").value = "";
    document.getElementById("password").value = "";
  });
