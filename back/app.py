from flask import Flask, jsonify, request, session
from flask_cors import CORS
import psycopg2
import json

app = Flask(__name__)

app.secret_key = "super_secret_key"
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False
CORS(
    app,
    supports_credentials=True
)

conn = psycopg2.connect(
    dbname="nepdendropark",
    user="postgres",
    password="karaganda243",
    host="localhost",
    port="5432"
)

@app.route("/plants")
def get_plants():
    country = request.args.get("country")
    height = request.args.get("height")
    type = request.args.get("type")
    year = request.args.get("year")
    print(f"Получены фильтры: type={type}, country={country}, year={year}, height={height}")
    query = """
        SELECT 
            p.id, 
            p.name_rus, 
            p.height, 
            p.country,
            p.year,
            p.leaf_type,
            pt.id as point_id,
            pt.latitude,
            pt.longitude,
            pt.description,
            p.image
        FROM plants p
        LEFT JOIN points pt ON p.id = pt.plant_id
    """

    conditions = []
    params = []

    # фильтр по стране
    if country and country != "all":
        conditions.append("p.country = %s")
        params.append(country)
    

    # фильтр по высоте
    if height:
        min_h, max_h = height.split("a")
        conditions.append("p.height >= %s AND p.height < %s")
        params.append(int(min_h))
        params.append(int(max_h))
    # фильтр по типу
    if type and type != "all":
        conditions.append("p.leaf_type = %s")
        params.append(type)
        
    # фильтр по году посадки
    if year:
        conditions.append("p.year <= %s")
        params.append(int(year))
    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY p.id, pt.id"

    cur = conn.cursor()
    cur.execute(query, params)
    rows = cur.fetchall()

    result = []

    for row in rows:
        result.append({
            "plant_id": row[0],
            "plant_name": row[1],
            "plant_height": row[2],
            "plant_country": row[3],
            "plant_year": row[4],
            "plant_type": row[5],
            "point_id": row[6],
            "latitude": float(row[7]) if row[7] else None,
            "longitude": float(row[8]) if row[8] else None,
            "description": row[9],
            "plant_image": row[10]
            
        })

    cur.close()
    return jsonify(result)

@app.route("/plants/<int:plant_id>")
def get_plant(plant_id):
    cur = conn.cursor()

    # само растение
    cur.execute("""
        SELECT name_rus, country, height, leaf_type, description, fact
        FROM plants
        WHERE id = %s
    """, (plant_id,))
    
    plant = cur.fetchone()

    # галерея
    cur.execute("""
        SELECT image_path
        FROM galery
        WHERE plant_id = %s
    """, (plant_id,))
    
    images = cur.fetchall()

    cur.close()

    return jsonify({
        "id": plant_id,
        "name": plant[0],
        "country": plant[1],
        "height": plant[2],
        "type": plant[3],
        "description": plant[4],
        "fact": plant[5],
        "images": [img[0] for img in images]
    })

@app.route("/map_objects")
def get_map_objects():
    cur = conn.cursor()

    cur.execute("""
        SELECT
            id,
            name,
            type,
            icon,
            ST_Y(geom),
            ST_X(geom)
        FROM map_objects
    """)

    objects = []

    for row in cur.fetchall():
        objects.append({
            "id": row[0],
            "name": row[1],
            "type": row[2],
            "icon": row[3],
            "lat": row[4],
            "lon": row[5]
        })

    cur.close()

    return jsonify(objects)

@app.route("/route/<int:route_id>")
def get_route(route_id):

    cur = conn.cursor()

    cur.execute("""
        SELECT
            rp.id,
            rp.step_order,
            rp.title,
            rp.latitude,
            rp.longitude,

            rp.short_info,
            rp.history_info,
            rp.look_around,
            rp.next_hint,

            rp.image_path,

            rp.path_to_next,

            p.year

        FROM route_points rp

        LEFT JOIN plants p
            ON rp.plant_id = p.id

        WHERE rp.route_id = %s

        ORDER BY rp.step_order
    """, (route_id,))

    rows = cur.fetchall()

    result = []

    for row in rows:

        result.append({
            "id": row[0],
            "step_order": row[1],
            "title": row[2],

            "latitude": row[3],
            "longitude": row[4],

            "short_info": row[5],
            "history_info": row[6],
            "look_around": row[7],
            "next_hint": row[8],

            "image": row[9],

            "path_to_next": row[10],

            "year": row[11],
        })

    return jsonify(result)

@app.route("/route")
def get_route_construct():

    start_id = request.args.get("startId")
    start_type = request.args.get("startType")

    end_id = request.args.get("endId")
    end_type = request.args.get("endType")

    mandatory = request.args.get("mandatory")

    if mandatory:
        mandatory_points = json.loads(mandatory)
    else:
        mandatory_points = []

    # определяем таблицы объектов
    start_table = "points" if start_type == "plant" else "map_objects"
    end_table = "points" if end_type == "plant" else "map_objects"

    start_geom_sql = f"""
        SELECT geom
        FROM {start_table}
        WHERE id = %s
    """

    end_geom_sql = f"""
        SELECT geom
        FROM {end_table}
        WHERE id = %s
    """

    cur = conn.cursor()

    # -----------------------------------------
    # формируем список вершин маршрута
    # -----------------------------------------

    vertex_ids = []

    # стартовая вершина
    cur.execute(f"""
        SELECT id
        FROM vert
        ORDER BY geom <-> (
            {start_geom_sql}
        )
        LIMIT 1
    """, (start_id,))

    vertex_ids.append(cur.fetchone()[0])

    # промежуточные точки
    for point in mandatory_points:

        table = (
            "points"
            if point["type"] == "plant"
            else "map_objects"
        )

        cur.execute(f"""
            SELECT id
            FROM vert
            ORDER BY geom <-> (
                SELECT geom
                FROM {table}
                WHERE id = %s
            )
            LIMIT 1
        """, (point["id"],))

        row = cur.fetchone()

        if row:
            vertex_ids.append(row[0])

    # конечная вершина
    cur.execute(f"""
        SELECT id
        FROM vert
        ORDER BY geom <-> (
            {end_geom_sql}
        )
        LIMIT 1
    """, (end_id,))

    vertex_ids.append(cur.fetchone()[0])

    # строка вида: 125,83,44,210
    via_vertices = ",".join(map(str, vertex_ids))

    # -----------------------------------------
    # основной маршрут
    # -----------------------------------------

    route_query = f"""
        SELECT
            ST_AsGeoJSON(
                ST_LineMerge(
                    ST_Union(p.geom)
                )
            ),
            ST_Length(
                ST_LineMerge(
                    ST_Union(p.geom)
                )::geography
            )
        FROM paths p
        JOIN (
            SELECT edge
            FROM pgr_dijkstraVia(
                '
                SELECT
                    id,
                    source,
                    target,
                    ST_Length(geom::geography) AS cost
                FROM paths
                ',
                ARRAY[{via_vertices}],
                directed := false
            )
            WHERE edge <> -1
        ) route
        ON p.id = route.edge
    """

    cur.execute(route_query)

    result = cur.fetchone()

    route = result[0]
    distance = result[1] or 0

    walking_speed = 1.1
    duration_seconds = distance / walking_speed
    duration_minutes = round(duration_seconds / 60)

    # -----------------------------------------
    # стартовый сегмент
    # -----------------------------------------

    start_segment_query = f"""
        SELECT ST_AsGeoJSON(
            ST_MakeLine(
                ST_ClosestPoint(
                    p.geom,
                    pt.geom
                ),
                v.geom
            )
        )
        FROM {start_table} pt,
             paths p,
             vert v
        WHERE pt.id = %s
          AND v.id = (
                SELECT id
                FROM vert
                ORDER BY geom <-> pt.geom
                LIMIT 1
          )
        ORDER BY p.geom <-> pt.geom
        LIMIT 1
    """

    cur.execute(start_segment_query, (start_id,))
    row = cur.fetchone()
    start_segment = row[0] if row else None

    # -----------------------------------------
    # конечный сегмент
    # -----------------------------------------

    end_segment_query = f"""
        SELECT ST_AsGeoJSON(
            ST_MakeLine(
                v.geom,
                ST_ClosestPoint(
                    p.geom,
                    pt.geom
                )
            )
        )
        FROM {end_table} pt,
             paths p,
             vert v
        WHERE pt.id = %s
          AND v.id = (
                SELECT id
                FROM vert
                ORDER BY geom <-> pt.geom
                LIMIT 1
          )
        ORDER BY p.geom <-> pt.geom
        LIMIT 1
    """

    cur.execute(end_segment_query, (end_id,))
    row = cur.fetchone()
    end_segment = row[0] if row else None

    cur.close()

    return jsonify({
        "route": route,
        "start_segment": start_segment,
        "end_segment": end_segment,
        "distance": round(distance, 1),
        "duration": duration_minutes
    })

@app.route("/login", methods=["POST"])
def login():

    data = request.json

    login = data.get("login")
    password = data.get("password")

    if login == "admin" and password == "12345":
        session["admin"] = True

        return jsonify({
            "success": True
        })

    return jsonify({
        "success": False
    }), 401
@app.route("/check_auth")
def check_auth():

    return jsonify({
        "authorized": session.get("admin", False)
    })
@app.route("/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "success": True
    })
@app.route("/admin/plants", methods=["POST"])
def add_plant():

    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json

    cur = conn.cursor()
    print("Полученные данные:", data)  # Отладка
    try:

        cur.execute("""
            INSERT INTO plants
            (
                name_rus,
                name_lat,
                country,
                height,
                year,
                leaf_type,
                description,
                fact,
                image
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data["name_rus"],
            data["name_lat"],
            data["country"],
            data["height"],
            data["year"],
            data["leaf_type"],
            data["description"],
            data["fact"],
            data["image"]
        ))

        conn.commit()

        return jsonify({
            "success": True
        })

    except Exception as e:

        conn.rollback()

        print(e)

        return jsonify({
            "error": str(e)
        }), 500

    finally:
        cur.close()
@app.route("/admin/plants")
def admin_get_plants():

    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    cur = conn.cursor()

    cur.execute("""
        SELECT id, name_rus
        FROM plants
        ORDER BY id
    """)

    rows = cur.fetchall()

    cur.close()

    return jsonify(rows)



@app.route("/admin/plants/<int:plant_id>", methods=["GET"])
def get_plant_for_edit(plant_id):
    """Получить данные растения для редактирования"""
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    cur = conn.cursor()
    
    cur.execute("""
        SELECT 
            id, 
            name_rus, 
            name_lat, 
            country, 
            height, 
            year, 
            leaf_type, 
            description, 
            fact, 
            image
        FROM plants 
        WHERE id = %s
    """, (plant_id,))
    
    row = cur.fetchone()
    cur.close()
    
    if not row:
        return jsonify({"error": "Plant not found"}), 404
    
    return jsonify({
        "id": row[0],
        "name_rus": row[1],
        "name_lat": row[2],
        "country": row[3],
        "height": row[4],
        "year": row[5],
        "leaf_type": row[6],
        "description": row[7],
        "fact": row[8],
        "image": row[9]
    })

@app.route("/admin/plants/<int:plant_id>", methods=["PUT"])
def update_plant(plant_id):
    """Обновить данные растения"""
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    cur = conn.cursor()
    
    try:
        cur.execute("""
            UPDATE plants 
            SET 
                name_rus = %s,
                name_lat = %s,
                country = %s,
                height = %s,
                year = %s,
                leaf_type = %s,
                description = %s,
                fact = %s,
                image = %s
            WHERE id = %s
        """, (
            data["name_rus"],
            data["name_lat"],
            data["country"],
            data["height"],
            data["year"],
            data["leaf_type"],
            data["description"],
            data["fact"],
            data["image"],
            plant_id
        ))
        
        conn.commit()
        cur.close()
        return jsonify({"success": True})
        
    except Exception as e:
        conn.rollback()
        cur.close()
        return jsonify({"error": str(e)}), 500
    
@app.route("/admin/plants/<int:id>", methods=["DELETE"])
def delete_plant(id):

    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    cur = conn.cursor()

    cur.execute(
        "DELETE FROM points WHERE plant_id = %s",
        (id,)
    )

    cur.execute(
        "DELETE FROM plants WHERE id = %s",
        (id,)
    )

    conn.commit()

    cur.close()

    return jsonify({
        "success": True
    })
@app.route("/admin/points", methods=["POST"])
def add_point():

    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json

    print(data)

    cur = conn.cursor()

    try:

        cur.execute("""
            INSERT INTO points
            (
                plant_id,
                latitude,
                longitude
            )
            VALUES (%s, %s, %s)
        """, (
            int(data["plant_id"]),
            float(data["latitude"]),
            float(data["longitude"])
        ))

        conn.commit()

        return jsonify({
            "success": True
        })

    except Exception as e:

        conn.rollback()

        print(e)

        return jsonify({
            "error": str(e)
        }), 500
    finally:
        cur.close()

@app.route("/admin/points")
def get_admin_points():

    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    cur = conn.cursor()

    cur.execute("""
        SELECT
            pt.id,
            pt.latitude,
            pt.longitude,
            p.name_rus
        FROM points pt
        JOIN plants p
            ON pt.plant_id = p.id
    """)

    rows = cur.fetchall()

    cur.close()

    result = []

    for row in rows:
        result.append({
            "point_id": row[0],
            "latitude": row[1],
            "longitude": row[2],
            "plant_name": row[3]
        })

    return jsonify(result)
@app.route("/admin/points/<int:point_id>", methods=["DELETE"])
def delete_point(point_id):

    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    cur = conn.cursor()

    cur.execute(
        "DELETE FROM points WHERE id = %s",
        (point_id,)
    )

    conn.commit()

    cur.close()

    return jsonify({
        "success": True
    })
if __name__ == "__main__":
    #app.run(debug=True)
    app.run(host="0.0.0.0", port=5000, debug=True)