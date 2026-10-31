<?php
/**
 * Animator Administration System - PHP PDO REST API Bridge
 * Deployable directly to Apache/Nginx web servers hosting phpMyAdmin.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --------------------------------------------------------------------------
// Database Credentials
// --------------------------------------------------------------------------
$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbPort = getenv('DB_PORT') ?: '3306';
$dbName = getenv('DB_NAME') ?: 'anim_uj';
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASSWORD') ?: '';

$validEventTypes = [
    'egyetemi rendezvény',
    'nagyrendezvény',
    'egyéb',
    'státuszújítás',
    'tisztújítás',
    'közgyűlés',
    'tréning'
];

try {
    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(503);
    echo json_encode([
        'status' => 'error',
        'message' => 'Adatbázis kapcsolódási hiba.',
        'error' => $e->getMessage()
    ]);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true) ?? [];

// Helper Router
// 1. GET /api/health
if ($method === 'GET' && preg_match('#/api/health$#', $uri)) {
    echo json_encode(['status' => 'ok', 'database' => 'connected', 'dbName' => $dbName]);
    exit;
}

// 1.1 GET /api/permissions/{animator_ID} - Check admin rights based on pozicio table
// Rule: Animator has admin rights IF they have a row in 'pozicio' linked to the latest 'tisztújítás' event.
if ($method === 'GET' && preg_match('#/api/permissions/(\d+)$#', $uri, $matches)) {
    $animatorId = (int)$matches[1];

    $latestStmt = $pdo->query("
        SELECT esemeny_ID, cim, DATE_FORMAT(datum, '%Y-%m-%d') AS datum 
        FROM esemeny 
        WHERE LOWER(tipus) = 'tisztújítás' OR LOWER(tipus) = 'tisztujitas' 
        ORDER BY datum DESC, esemeny_ID DESC 
        LIMIT 1
    ");
    $latestEvent = $latestStmt->fetch();

    if (!$latestEvent) {
        echo json_encode([
            'animator_ID' => $animatorId,
            'isAdmin' => false,
            'pozicio' => null,
            'latestTisztujitas' => null
        ]);
        exit;
    }

    $posStmt = $pdo->prepare("
        SELECT pozicio_ID, pozicio 
        FROM pozicio 
        WHERE animator_ID = ? AND esemeny_ID = ? 
        LIMIT 1
    ");
    $posStmt->execute([$animatorId, (int)$latestEvent['esemeny_ID']]);
    $pos = $posStmt->fetch();

    echo json_encode([
        'animator_ID' => $animatorId,
        'isAdmin' => (bool)$pos,
        'pozicio' => $pos ? $pos['pozicio'] : null,
        'latestTisztujitas' => [
            'esemeny_ID' => (int)$latestEvent['esemeny_ID'],
            'cim' => $latestEvent['cim'],
            'datum' => $latestEvent['datum']
        ]
    ]);
    exit;
}

// 2. GET /api/events/next-id
if ($method === 'GET' && preg_match('#/api/events/next-id$#', $uri)) {
    $stmt = $pdo->query('SELECT COALESCE(MAX(esemeny_ID), 0) + 1 AS next_esemeny_ID FROM esemeny');
    $row = $stmt->fetch();
    echo json_encode(['next_esemeny_ID' => (int)$row['next_esemeny_ID']]);
    exit;
}

// 3. GET /api/events
if ($method === 'GET' && preg_match('#/api/events$#', $uri)) {
    $query = "
      SELECT 
        e.esemeny_ID, 
        e.cim, 
        DATE_FORMAT(e.datum, '%Y-%m-%d %H:%i:%s') AS datum, 
        e.tipus,
        COUNT(j.jelenlet_ID) AS attendeeCount
      FROM esemeny e
      LEFT JOIN jelenlet j ON e.esemeny_ID = j.esemeny_ID
      GROUP BY e.esemeny_ID, e.cim, e.datum, e.tipus
      ORDER BY e.datum DESC, e.esemeny_ID DESC
    ";
    $stmt = $pdo->query($query);
    echo json_encode($stmt->fetchAll());
    exit;
}

// 4. POST /api/events
if ($method === 'POST' && preg_match('#/api/events$#', $uri)) {
    $cim = trim($body['cim'] ?? '');
    $datum = trim($body['datum'] ?? '');
    $tipus = trim($body['tipus'] ?? '');

    if (empty($cim) || empty($datum) || empty($tipus) || !in_array($tipus, $validEventTypes, true)) {
        http_response_code(400);
        echo json_encode(['message' => 'Érvénytelen bemeneti adatok vagy nem támogatott eseménytípus.']);
        exit;
    }

    $stmt = $pdo->prepare('INSERT INTO esemeny (cim, datum, tipus) VALUES (?, ?, ?)');
    $stmt->execute([$cim, $datum, $tipus]);

    http_response_code(201);
    echo json_encode([
        'esemeny_ID' => (int)$pdo->lastInsertId(),
        'message' => 'Esemény sikeresen létrehozva.'
    ]);
    exit;
}

// 4.1 POST /api/tisztujitas - Create Tisztújítás event with leadership positions
if ($method === 'POST' && preg_match('#/api/tisztujitas$#', $uri)) {
    $cim = trim($body['cim'] ?? '') ?: 'Tisztújítás';
    $datum = trim($body['datum'] ?? '');
    $poziciok = $body['poziciok'] ?? [];

    if (empty($datum)) {
        http_response_code(400);
        echo json_encode(['message' => 'Érvényes dátum megadása kötelező.']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        $idStmt = $pdo->query('SELECT COALESCE(MAX(esemeny_ID), 0) + 1 AS next_id FROM esemeny');
        $nextEventId = (int)$idStmt->fetch()['next_id'];

        $eventStmt = $pdo->prepare('INSERT INTO esemeny (esemeny_ID, cim, datum, tipus) VALUES (?, ?, ?, ?)');
        $eventStmt->execute([$nextEventId, $cim, $datum, 'tisztújítás']);

        if (is_array($poziciok) && count($poziciok) > 0) {
            $posIdStmt = $pdo->query('SELECT COALESCE(MAX(pozicio_ID), 0) + 1 AS next_pos_id FROM pozicio');
            $nextPosId = (int)$posIdStmt->fetch()['next_pos_id'];

            $insertPosStmt = $pdo->prepare('INSERT INTO pozicio (pozicio_ID, animator_ID, esemeny_ID, pozicio) VALUES (?, ?, ?, ?)');
            foreach ($poziciok as $p) {
                $animId = (int)($p['animator_ID'] ?? 0);
                $posTitle = trim($p['pozicio'] ?? '');
                if ($animId > 0 && !empty($posTitle)) {
                    $insertPosStmt->execute([$nextPosId++, $animId, $nextEventId, $posTitle]);
                }
            }
        }

        $pdo->commit();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'esemeny_ID' => $nextEventId,
            'event' => [
                'esemeny_ID' => $nextEventId,
                'cim' => $cim,
                'datum' => $datum,
                'tipus' => 'tisztújítás',
                'attendeeCount' => 0
            ],
            'message' => 'Tisztújítás és a pozíciók sikeresen létrehozva.'
        ]);
        exit;
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['message' => 'Hiba a tisztújítás mentésekor.', 'error' => $e->getMessage()]);
        exit;
    }
}

// 4.2 GET /api/events/{id}/positions
if ($method === 'GET' && preg_match('#/api/events/(\d+)/positions$#', $uri, $matches)) {
    $eventId = (int)$matches[1];
    $stmt = $pdo->prepare("
        SELECT p.pozicio_ID, p.animator_ID, p.esemeny_ID, p.pozicio, a.nev AS animator_nev
        FROM pozicio p
        LEFT JOIN animator a ON p.animator_ID = a.animator_ID
        WHERE p.esemeny_ID = ?
        ORDER BY p.pozicio_ID ASC
    ");
    $stmt->execute([$eventId]);
    echo json_encode($stmt->fetchAll());
    exit;
}

// 4.3 GET /api/positions
if ($method === 'GET' && preg_match('#/api/positions$#', $uri)) {
    $stmt = $pdo->query("
        SELECT p.pozicio_ID, p.animator_ID, p.esemeny_ID, p.pozicio, a.nev AS animator_nev
        FROM pozicio p
        LEFT JOIN animator a ON p.animator_ID = a.animator_ID
        ORDER BY p.pozicio_ID ASC
    ");
    echo json_encode($stmt->fetchAll());
    exit;
}

// 5. GET /api/animators
if ($method === 'GET' && preg_match('#/api/animators$#', $uri)) {
    $stmt = $pdo->query('SELECT animator_ID, nev, shibboleth, telefonszam, email, kategoria FROM animator ORDER BY nev ASC');
    echo json_encode($stmt->fetchAll());
    exit;
}

// 5.1 GET /api/animators/{id}/attendances - Attendances for specific animator
if ($method === 'GET' && preg_match('#/api/animators/(\d+)/attendances$#', $uri, $matches)) {
    $animatorId = (int)$matches[1];
    $stmt = $pdo->prepare('
        SELECT j.jelenlet_ID, j.esemeny_ID, j.animator_ID, e.cim, DATE_FORMAT(e.datum, "%Y-%m-%d") AS datum, e.tipus 
        FROM jelenlet j 
        JOIN esemeny e ON j.esemeny_ID = e.esemeny_ID 
        WHERE j.animator_ID = ?
        ORDER BY e.datum DESC
    ');
    $stmt->execute([$animatorId]);
    echo json_encode($stmt->fetchAll());
    exit;
}

// 6. GET /api/events/{id}/attendances
if ($method === 'GET' && preg_match('#/api/events/(\d+)/attendances$#', $uri, $matches)) {
    $eventId = (int)$matches[1];
    $stmt = $pdo->prepare("
        SELECT 
          j.jelenlet_ID, 
          j.esemeny_ID, 
          j.animator_ID, 
          a.nev, 
          a.kategoria, 
          a.shibboleth
        FROM jelenlet j
        JOIN animator a ON j.animator_ID = a.animator_ID
        WHERE j.esemeny_ID = ?
        ORDER BY a.nev ASC
    ");
    $stmt->execute([$eventId]);
    echo json_encode($stmt->fetchAll());
    exit;
}

// 7. POST /api/events/{id}/attendances (Transactional batch insert)
if ($method === 'POST' && preg_match('#/api/events/(\d+)/attendances$#', $uri, $matches)) {
    $eventId = (int)$matches[1];
    $animatorIds = array_filter(array_map('intval', $body['animator_ids'] ?? []));

    if (empty($animatorIds)) {
        http_response_code(400);
        echo json_encode(['message' => 'Legalább egy animátor azonosító megadása szükséges.']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        // Check event exists
        $stmt = $pdo->prepare('SELECT esemeny_ID FROM esemeny WHERE esemeny_ID = ?');
        $stmt->execute([$eventId]);
        if (!$stmt->fetch()) {
            $pdo->rollBack();
            http_response_code(404);
            echo json_encode(['message' => 'Az esemény nem található.']);
            exit;
        }

        // Check duplicates
        $placeholders = implode(',', array_fill(0, count($animatorIds), '?'));
        $stmt = $pdo->prepare("SELECT animator_ID FROM jelenlet WHERE esemeny_ID = ? AND animator_ID IN ({$placeholders})");
        $stmt->execute(array_merge([$eventId], $animatorIds));
        $dupes = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($dupes)) {
            $pdo->rollBack();
            http_response_code(409);
            echo json_encode([
                'message' => 'Már rögzített animátor található a listában: ' . implode(', ', $dupes),
                'duplicateIds' => $dupes
            ]);
            exit;
        }

        // Batch insert
        $insertStmt = $pdo->prepare('INSERT INTO jelenlet (animator_ID, esemeny_ID) VALUES (?, ?)');
        foreach ($animatorIds as $id) {
            $insertStmt->execute([$id, $eventId]);
        }

        $pdo->commit();
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'count' => count($animatorIds),
            'message' => 'Jelenlétek sikeresen rögzítve.'
        ]);
        exit;
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['message' => 'Hiba a mentés során.', 'error' => $e->getMessage()]);
        exit;
    }
}

// 8. DELETE /api/attendances/{id}
if ($method === 'DELETE' && preg_match('#/api/attendances/(\d+)$#', $uri, $matches)) {
    $jelenletId = (int)$matches[1];
    $stmt = $pdo->prepare('DELETE FROM jelenlet WHERE jelenlet_ID = ?');
    $stmt->execute([$jelenletId]);
    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Jelenlét sikeresen törölve.']);
    } else {
        http_response_code(404);
        echo json_encode(['message' => 'Jelenléti rekord nem található.']);
    }
    exit;
}

// 9. GET & POST /api/kgy/state - Shared Közgyűlés state for all clients
if (preg_match('#/api/kgy/state$#', $uri)) {
    $kgyFile = __DIR__ . '/kgy_state.json';
    if ($method === 'GET') {
        if (file_exists($kgyFile)) {
            echo file_get_contents($kgyFile);
        } else {
            echo json_encode([
                'isAttendanceActive' => true,
                'isSummaryActive' => false,
                'attendees' => [1001],
                'polls' => []
            ]);
        }
        exit;
    }
    if ($method === 'POST') {
        file_put_contents($kgyFile, json_encode($body, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode($body);
        exit;
    }
}

http_response_code(404);
echo json_encode(['message' => 'A megadott API végpont nem található.']);
