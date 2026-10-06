<?php
header("X-Powered-By:");
/* Heligonka Tabulator — api-actions.php: endpoint implementace (PHP 5-safe) */

/* ---------- helpers ---------- */
function now() { return date('Y-m-d H:i:s'); }
function body_json() {
    $raw = file_get_contents('php://input');
    $d = jt_json_decode($raw);
    if (!is_array($d)) { $d = $_POST; }
    return $d;
}
function g($arr, $k, $def = '') { return isset($arr[$k]) ? $arr[$k] : $def; }

/* ---------- auth ---------- */
function api_register() {
    ht_sec_headers();
    ensure_tables();
    $d = body_json();
    $u = trim(g($d, 'username'));
    $p = g($d, 'password');
    if (!ht_valid_username($u) || !ht_valid_password($p)) err('invalid_input');
    ht_rate_check('register', $u);
    ht_rate_hit('register', $u);
    $q = mysql_query("SELECT id FROM `" . HT_PREFIX . "users` WHERE username = '" . dbq($u) . "'", $GLOBALS['conn']);
    if (mysql_num_rows($q)) err('user_exists');
    // první registrovaný = admin, schválen (to bude Vilda)
    $n = (int)mysql_result(mysql_query("SELECT COUNT(*) FROM `" . HT_PREFIX . "users`", $GLOBALS['conn']), 0, 0);
    $role = $n === 0 ? 'admin' : 'reader';
    $appr = $n === 0 ? 1 : 0;
    mysql_query("INSERT INTO `" . HT_PREFIX . "users` (username, pass_hash, role, approved, created_at)
                 VALUES ('" . dbq($u) . "', '" . dbq(password_hash_compat($p)) . "', '$role', $appr, '" . now() . "')", $GLOBALS['conn']);
    // e-mailová notifikace adminovi (Vilda) — jen pro čekající registrace (admin se rodí právě u prvního)
    if (!$appr) {
        $ip = isset($_SERVER['HTTP_X_REAL_IP']) ? $_SERVER['HTTP_X_REAL_IP']
            : (isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? trim(array_shift(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']))) : '');
        if (!$ip) $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'neznámá';
        ht_notify_admin_new_user($u, substr($ip, 0, 64));
    }
    echo '{"status":"ok","pending":' . ($appr ? 'false' : 'true') . ',"role":"' . $role . '"}';
}
function password_hash_compat($p) {
    if (function_exists('password_hash')) return password_hash($p, PASSWORD_DEFAULT);
    return sha1('heligonka-salt-' . $p); // legacy fallback
}
function password_verify_compat($p, $h) {
    if (function_exists('password_verify')) return password_verify($p, $h) || $h === sha1('heligonka-salt-' . $p);
    return $h === sha1('heligonka-salt-' . $p);
}
function start_session($user_id) {
    $sid = bin2hex(mcrypt_compat_bytes(32));
    mysql_query("INSERT INTO `" . HT_PREFIX . "sessions` (sid, user_id, created_at) VALUES ('$sid', $user_id, '" . now() . "')", $GLOBALS['conn']);
    return $sid;
}
function mcrypt_compat_bytes($n) {
    if (function_exists('random_bytes')) return random_bytes($n);
    if (function_exists('openssl_random_pseudo_bytes')) return openssl_random_pseudo_bytes($n);
    $s = ''; for ($i = 0; $i < $n; $i++) $s .= chr(mt_rand(0, 255)); return $s;
}
function api_login() {
    ht_sec_headers();
    ensure_tables();
    $d = body_json();
    $u = trim(g($d, 'username'));
    $p = g($d, 'password');
    if (!ht_valid_username($u) || !ht_valid_password($p)) err('bad_credentials');
    ht_rate_check('login', $u);
    $q = mysql_query("SELECT * FROM `" . HT_PREFIX . "users` WHERE username = '" . dbq($u) . "'", $GLOBALS['conn']);
    $row = mysql_fetch_assoc($q);
    if (!$row || !password_verify_compat($p, $row['pass_hash'])) { ht_rate_hit('login', $u); err('bad_credentials'); }
    ht_rate_clear('login', $u);
    if (!(int)$row['approved']) { echo '{"status":"ok","pending":true}'; exit; }
    $sid = start_session((int)$row['id']);
    echo '{"status":"ok","pending":false,"sid":' . jt_json($sid) . ',"user":' . jt_json(array('username' => $row['username'], 'role' => $row['role'])) . '}';
}
function api_logout() {
    $sid = isset($_SERVER['HTTP_X_SESSION']) ? $_SERVER['HTTP_X_SESSION'] : '';
    if ($sid) mysql_query("DELETE FROM `" . HT_PREFIX . "sessions` WHERE sid = '" . dbq($sid) . "'", $GLOBALS['conn']);
    echo '{"status":"ok"}';
}
function api_me($U) {
    if (!$U) err('unauthenticated');
    echo '{"status":"ok","user":' . jt_json(array('username' => $U['username'], 'role' => $U['role'], 'approved' => (bool)(int)$U['approved'])) . '}';
}

/* ---------- songs: public read ---------- */
function song_avg($song_id) {
    $q = mysql_query("SELECT COUNT(*) c, AVG(stars) a FROM `" . HT_PREFIX . "ratings` WHERE song_id = " . (int)$song_id, $GLOBALS['conn']);
    $r = mysql_fetch_assoc($q);
    return array('avg' => $r['a'] === null ? null : round((float)$r['a'], 2), 'count' => (int)$r['c']);
}
function author_name($id) {
    if (!$id) return '';
    $q = mysql_query("SELECT username FROM `" . HT_PREFIX . "users` WHERE id = " . (int)$id, $GLOBALS['conn']);
    $r = mysql_fetch_assoc($q);
    return $r ? $r['username'] : '?';
}
function api_list() {
    ensure_tables();
    $q = mysql_query("SELECT id, title, the_key, author_id, forked_from, published, created_at, updated_at, version
                      FROM `" . HT_PREFIX . "songs` ORDER BY updated_at DESC", $GLOBALS['conn']);
    $out = array();
    while ($r = mysql_fetch_assoc($q)) {
        $r['author'] = author_name($r['author_id']);
        $avg = song_avg($r['id']);
        $r['rating_avg'] = $avg['avg']; $r['rating_count'] = $avg['count'];
        unset($r['author_id']);
        $out[] = $r;
    }
    echo jt_json(array('status' => 'ok', 'songs' => array_values($out)));
}
function api_get() {
    ensure_tables();
    $id = (int)g($_GET, 'id', 0);
    $q = mysql_query("SELECT * FROM `" . HT_PREFIX . "songs` WHERE id = $id", $GLOBALS['conn']);
    $r = mysql_fetch_assoc($q);
    if (!$r) err('not_found');
    $r['author'] = author_name($r['author_id']);
    unset($r['author_id']);
    $avg = song_avg($id);
    $r['rating_avg'] = $avg['avg']; $r['rating_count'] = $avg['count'];
    echo '{"status":"ok","song":' . jt_json($r) . '}';
}
function api_search() {
    ensure_tables();
    $t = ht_like(substr(strval(g($_GET, 'q', '')), 0, 100));
    $q = mysql_query("SELECT id, title, the_key, author_id, created_at, updated_at, version, published
                      FROM `" . HT_PREFIX . "songs`
                      WHERE title LIKE '%$t%' OR data LIKE '%$t%'
                      ORDER BY updated_at DESC LIMIT 50", $GLOBALS['conn']);
    $out = array();
    while ($r = mysql_fetch_assoc($q)) {
        $r['author'] = author_name($r['author_id']);
        unset($r['author_id']);
        $avg = song_avg($r['id']); $r['rating_avg'] = $avg['avg']; $r['rating_count'] = $avg['count'];
        $out[] = $r;
    }
    echo jt_json(array('status' => 'ok', 'songs' => array_values($out)));
}

/* ---------- songs: write ---------- */
function can_edit_song($U, $song) {
    if (!$U) return false;
    if ($U['role'] === 'admin') return true;
    if ($U['role'] !== 'editor') return false;
    return (int)$song['author_id'] === (int)$U['id'];
}
function save_version($song) {
    mysql_query("INSERT INTO `" . HT_PREFIX . "song_versions` (song_id, version, the_key, data, author_id, created_at)
                 VALUES (" . (int)$song['id'] . ", " . (int)$song['version'] . ", '" . dbq($song['the_key']) . "',
                          '" . dbq($song['data']) . "', " . (int)$song['author_id'] . ", '" . now() . "')", $GLOBALS['conn']);
}
function api_create($U) {
    require_role($U, 'editor');
    $d = body_json();
    $title = ht_clean_title(g($d, 'title')); $data = g($d, 'data'); $key = strtoupper(g($d, 'key', 'F'));
    if (!$title || !ht_valid_data($data) || !ht_valid_key($key)) err('invalid_input');
    mysql_query("INSERT INTO `" . HT_PREFIX . "songs` (title, the_key, data, author_id, published, created_at, updated_at)
                 VALUES ('" . dbq($title) . "', '" . dbq($key) . "', '" . dbq($data) . "', " . (int)$U['id'] . ", 1, '" . now() . "', '" . now() . "')", $GLOBALS['conn']);
    $id = (int)mysql_insert_id($GLOBALS['conn']);
    echo '{"status":"ok","id":' . $id . '}';
}
function api_update($U) {
    require_role($U, 'editor');
    $d = body_json();
    $id = (int)g($d, 'id');
    $q = mysql_query("SELECT * FROM `" . HT_PREFIX . "songs` WHERE id = $id", $GLOBALS['conn']);
    $s = mysql_fetch_assoc($q);
    if (!$s) err('not_found');
    if (!can_edit_song($U, $s)) err('forbidden');
    $title = ht_clean_title(g($d, 'title', $s['title']));
    $data = g($d, 'data', $s['data']);
    $key = strtoupper(g($d, 'key', $s['the_key']));
    if (!$title || !ht_valid_data($data) || !ht_valid_key($key)) err('invalid_input');
    save_version($s); // uložit předchozí verzi
    $nv = (int)$s['version'] + 1;
    mysql_query("UPDATE `" . HT_PREFIX . "songs` SET title = '" . dbq($title) . "', the_key = '" . dbq($key) . "',
                 data = '" . dbq($data) . "', version = $nv, updated_at = '" . now() . "' WHERE id = $id", $GLOBALS['conn']);
    echo '{"status":"ok","version":' . $nv . '}';
}
function api_delete($U) {
    require_role($U, 'editor');
    $d = body_json();
    $id = (int)g($d, 'id');
    $q = mysql_query("SELECT * FROM `" . HT_PREFIX . "songs` WHERE id = $id", $GLOBALS['conn']);
    $s = mysql_fetch_assoc($q);
    if (!$s) err('not_found');
    if (!can_edit_song($U, $s)) err('forbidden');
    mysql_query("DELETE FROM `" . HT_PREFIX . "songs` WHERE id = $id", $GLOBALS['conn']);
    mysql_query("DELETE FROM `" . HT_PREFIX . "ratings` WHERE song_id = $id", $GLOBALS['conn']);
    echo '{"status":"ok"}';
}
function api_fork($U) {
    require_role($U, 'editor');
    $d = body_json();
    $id = (int)g($d, 'id');
    $q = mysql_query("SELECT * FROM `" . HT_PREFIX . "songs` WHERE id = $id", $GLOBALS['conn']);
    $s = mysql_fetch_assoc($q);
    if (!$s) err('not_found');
    $nt = ht_clean_title($s['title']) . ' (kopie ' . $U['username'] . ')';
    mysql_query("INSERT INTO `" . HT_PREFIX . "songs` (title, the_key, data, author_id, forked_from, published, created_at, updated_at)
                 VALUES ('" . dbq($nt) . "', '" . dbq($s['the_key']) . "', '" . dbq($s['data']) . "',
                         " . (int)$U['id'] . ", $id, 1, '" . now() . "', '" . now() . "')", $GLOBALS['conn']);
    echo '{"status":"ok","id":' . (int)mysql_insert_id($GLOBALS['conn']) . '}';
}
function api_versions() {
    ensure_tables();
    $id = (int)g($_GET, 'id', 0);
    $q = mysql_query("SELECT version, the_key, author_id, created_at FROM `" . HT_PREFIX . "song_versions`
                      WHERE song_id = $id ORDER BY version DESC", $GLOBALS['conn']);
    $out = array();
    while ($r = mysql_fetch_assoc($q)) { $r['author'] = author_name($r['author_id']); unset($r['author_id']); $out[] = $r; }
    echo jt_json(array('status' => 'ok', 'versions' => array_values($out)));
}

/* ---------- rating ---------- */
function api_rate($U) {
    if (!$U) err('unauthenticated');
    $d = body_json();
    $id = (int)g($d, 'id'); $stars = (int)g($d, 'stars');
    if ($id < 1 || $stars < 1 || $stars > 5) err('invalid_input');
    mysql_query("DELETE FROM `" . HT_PREFIX . "ratings` WHERE song_id = $id AND user_id = " . (int)$U['id'], $GLOBALS['conn']);
    mysql_query("INSERT INTO `" . HT_PREFIX . "ratings` (song_id, user_id, stars, created_at)
                 VALUES ($id, " . (int)$U['id'] . ", $stars, '" . now() . "')", $GLOBALS['conn']);
    $avg = song_avg($id);
    echo '{"status":"ok","rating_avg":' . jt_json($avg['avg']) . ',"rating_count":' . $avg['count'] . '}';
}

/* ---------- admin ---------- */
function api_admin_pending($U) {
    require_role($U, 'admin');
    $q = mysql_query("SELECT id, username, created_at FROM `" . HT_PREFIX . "users` WHERE approved = 0 ORDER BY created_at", $GLOBALS['conn']);
    $out = array();
    while ($r = mysql_fetch_assoc($q)) $out[] = $r;
    echo jt_json(array('status' => 'ok', 'users' => array_values($out)));
}
function api_admin_approve($U) {
    require_role($U, 'admin');
    $d = body_json();
    $id = (int)g($d, 'id');
    $role = g($d, 'role', 'reader');
    if (!in_array($role, array('reader', 'editor'))) $role = 'reader';
    mysql_query("UPDATE `" . HT_PREFIX . "users` SET approved = 1, role = '$role' WHERE id = $id", $GLOBALS['conn']);
    echo '{"status":"ok"}';
}
function api_admin_users($U) {
    require_role($U, 'admin');
    $q = mysql_query("SELECT id, username, role, approved, created_at FROM `" . HT_PREFIX . "users` ORDER BY id", $GLOBALS['conn']);
    $out = array();
    while ($r = mysql_fetch_assoc($q)) $out[] = $r;
    echo jt_json(array('status' => 'ok', 'users' => array_values($out)));
}
function api_admin_role($U) {
    require_role($U, 'admin');
    $d = body_json();
    $id = (int)g($d, 'id');
    $role = g($d, 'role', 'reader');
    if (!in_array($role, array('reader', 'editor', 'admin'))) err('invalid_input');
    mysql_query("UPDATE `" . HT_PREFIX . "users` SET role = '$role' WHERE id = $id", $GLOBALS['conn']);
    echo '{"status":"ok"}';
}
/* ---------- admin: full user management + library management ---------- */
function api_admin_users_all($U) {
    require_role($U, 'admin');
    $q = mysql_query("SELECT id, username, role, approved, created_at FROM `". HT_PREFIX . "users` ORDER BY id", $GLOBALS['conn']);
    $out = array();
    while ($r = mysql_fetch_assoc($q)) $out[] = $r;
    jout(array('status' => 'ok', 'users' => $out));
}
function api_admin_delete_user($U) {
    require_role($U, 'admin');
    $d = body_json();
    $id = (int)g($d, 'id');
    if ($id === (int)$U['id']) err('cannot_delete_self');
    // anonymizovat autorství písní (nevadit cizím referencím)
    mysql_query("UPDATE `" . HT_PREFIX . "songs` SET author_id = 0 WHERE author_id = $id", $GLOBALS['conn']);
    mysql_query("DELETE FROM `" . HT_PREFIX . "users` WHERE id = $id", $GLOBALS['conn']);
    mysql_query("DELETE FROM `" . HT_PREFIX . "sessions` WHERE user_id = $id", $GLOBALS['conn']);
    echo '{"status":"ok"}';
}
function api_admin_set_role($U) {
    require_role($U, 'admin');
    $d = body_json();
    $id = (int)g($d, 'id');
    $role = g($d, 'role', 'reader');
    if (!in_array($role, array('reader','editor','admin'))) err('invalid_input');
    mysql_query("UPDATE `" . HT_PREFIX . "users` SET role = '$role' WHERE id = $id", $GLOBALS['conn']);
    echo '{"status":"ok"}';
}
function api_admin_disapprove($U) {
    require_role($U, 'admin');
    $d = body_json();
    $id = (int)g($d, 'id');
    mysql_query("UPDATE `" . HT_PREFIX . "users` SET approved = 0 WHERE id = $id", $GLOBALS['conn']);
    mysql_query("DELETE FROM `" . HT_PREFIX . "sessions` WHERE user_id = $id", $GLOBALS['conn']);
    echo '{"status":"ok"}';
}
function api_admin_reset_password($U) {
    require_role($U, 'admin');
    $d = body_json();
    $id = (int)g($d, 'id');
    $np = g($d, 'password');
    if (!ht_valid_password($np)) err('invalid_input');
    mysql_query("UPDATE `" . HT_PREFIX . "users` SET pass_hash = '" . dbq(password_hash_compat($np)) . "' WHERE id = $id", $GLOBALS['conn']);
    mysql_query("DELETE FROM `" . HT_PREFIX . "sessions` WHERE user_id = $id", $GLOBALS['conn']);
    echo '{"status":"ok"}';
}
function api_admin_delete_song($U) {
    require_role($U, 'admin');
    $d = body_json();
    $id = (int)g($d, 'id');
    mysql_query("DELETE FROM `" . HT_PREFIX . "songs` WHERE id = $id", $GLOBALS['conn']);
    mysql_query("DELETE FROM `" . HT_PREFIX . "ratings` WHERE song_id = $id", $GLOBALS['conn']);
    echo '{"status":"ok"}';
}

/* ---------- email notify on new registration (Vilda 6.10.2026 09:19) ---------- */
function ht_notify_admin_new_user($username, $ip) {
    $to = 'vilem@kuzelovi.cz';
    $subject = '=?UTF-8?B?' . base64_encode('Heligonka: nová registrace — ' . $username) . '?=';
    $body =
        "\nNová registrace v Heligonka Tabulator:\n\n" .
        "  Uživatel:  " . $username . "\n" .
        "  Čas:       " . date('j.n.Y H:i') . "\n" .
        "  IP:        " . $ip . "\n\n" .
        "Schválit: https://klepeto.kuzelovi.cz/heligonka/ (Admin panel)\n\n" .
        "-- \nKlepeto (Heligonka Tabulator)";
    $headers =
        "From: Klepeto <sprostaveverka@seznam.cz>\r\n" .
        "Content-Type: text/plain; charset=UTF-8\r\n" .
        "Reply-To: sprostaveverka@seznam.cz\r\n";
    // nečekáme na SMTP dlouho; @ — selhání nesmí rozbít registraci
    return @mail($to, $subject, $body, $headers, '-fsprostaveverka@seznam.cz');
}
