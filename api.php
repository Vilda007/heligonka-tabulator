<?php
header("X-Powered-By:");
/* Heligonka Tabulator — API (PHP 5.x-compatible, MySQL)
   Endpoints JSON + hand-built JSON (php5-safe via json_encode if exists, else manual). */

// CORS pro GitHub Pages origin
$allowed = array('https://vilda007.github.io', 'http://localhost:8000', 'https://klepeto.kuzelovi.cz');
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if ($origin && in_array($origin, $allowed)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Session');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

header('Content-Type: application/json; charset=utf-8');

include 'db.php';
include 'api-actions.php';
$action = isset($_GET['action']) ? $_GET['action'] : '';

/* ---- session helper ---- */
function current_user() {
    $sid = isset($_SERVER['HTTP_X_SESSION']) ? $_SERVER['HTTP_X_SESSION'] : '';
    if (strlen($sid) < 16) return false;
    return session_get_user($sid);
}

$U = current_user();

/* ---- router ---- */
switch ($action) {
    case 'ping':            die('{"status":"ok"}');

    /* auth */
    case 'register':        api_register(); break;
    case 'login':           api_login(); break;
    case 'logout':          api_logout(); break;
    case 'me':              api_me($U); break;

    /* songs — read (public) */
    case 'list':            api_list(); break;
    case 'get':             api_get(); break;
    case 'search':          api_search(); break;

    /* songs — write (role-gated) */
    case 'create':          api_create($U); break;
    case 'update':          api_update($U); break;
    case 'delete':          api_delete($U); break;
    case 'fork':            api_fork($U); break;
    case 'versions':        api_versions(); break;

    /* rating */
    case 'rate':            api_rate($U); break;

    /* admin */
    case 'admin_pending':   api_admin_pending($U); break;
    case 'admin_approve':   api_admin_approve($U); break;
    case 'admin_users':     api_admin_users($U); break;
    case 'admin_role':      api_admin_role($U); break;
    case 'admin_users_all': api_admin_users_all($U); break;
    case 'admin_set_role':  api_admin_set_role($U); break;
    case 'admin_delete_user': api_admin_delete_user($U); break;
    case 'admin_disapprove': api_admin_disapprove($U); break;
    case 'admin_reset_password': api_admin_reset_password($U); break;
    case 'admin_delete_song': api_admin_delete_song($U); break;

    default:
        echo '{"status":"error","code":"unknown_action"}';
}