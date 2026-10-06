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
        // SMTP direct (mail() na hostingu nefunguje); fallback i na staré ht_notify_admin_new_user
        if (!ht_notify_admin_new_user_smtp($u, substr($ip, 0, 64))) {
            ht_notify_admin_new_user($u, substr($ip, 0, 64));
        }
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
    echo '{"status":"ok","user":' . jt_json(array('username' => $U['username'], 'role' => $U['role'], 'approved' => (bool)(int)$U['approved'], 'layout' => $U['layout'], 'bio' => $U['bio'], 'ui_lang' => ht_norm_ui_lang($U['ui_lang']), 'def_lang' => ht_norm_lang($U['def_lang']))) . '}';
}

/* Můj nástroj: uložení layoutu (počet řad, knoflíků, ladění) — "2;12;F" formát */
function api_save_layout($U) {
    if (!$U) err('unauthenticated');
    $d = body_json();
    $layout = substr(strval(g($d, 'layout', '')), 0, 50);
    if (!preg_match('/^[0-9]{1,2};[0-9]{1,2};(F|C|G|A|D|Bb)$/', $layout)) err('invalid_input');
    mysql_query("UPDATE `" . HT_PREFIX . "users` SET layout = '" . dbq($layout) . "' WHERE id = " . (int)$U['id'], $GLOBALS['conn']);
    echo '{"status":"ok"}';
}

/* Můj účet: změna hesla (staré + nové) */
function api_change_password($U) {
    if (!$U) err('unauthenticated');
    $d = body_json();
    $old = g($d, 'old');
    $new = g($d, 'new');
    if (!ht_valid_password($new)) err('invalid_input');
    $q = mysql_query("SELECT pass_hash FROM `" . HT_PREFIX . "users` WHERE id = " . (int)$U['id'], $GLOBALS['conn']);
    $r = mysql_fetch_assoc($q);
    if (!$r || !password_verify_compat($old, $r['pass_hash'])) err('bad_credentials');
    $hash = password_hash_compat($new);
    mysql_query("UPDATE `" . HT_PREFIX . "users` SET pass_hash = '" . dbq($hash) . "' WHERE id = " . (int)$U['id'], $GLOBALS['conn']);
    echo '{"status":"ok"}';
}

/* Můj účet: uložení profilu — bio, jazyk UI, výchozí jazyk písní */
function api_save_profile($U) {
    if (!$U) err('unauthenticated');
    $d = body_json();
    $bio = ht_clean_bio(g($d, 'bio', ''));
    $ui_lang = ht_norm_ui_lang(g($d, 'ui_lang', 'CZ'));
    $def_lang = ht_norm_lang(g($d, 'def_lang', 'CZ'));
    mysql_query("UPDATE `" . HT_PREFIX . "users` SET bio = '" . dbq($bio) . "', ui_lang = '" . dbq($ui_lang) . "', def_lang = '" . dbq($def_lang) . "' WHERE id = " . (int)$U['id'], $GLOBALS['conn']);
    echo '{"status":"ok"}';
}

/* Můj účet: smazání účtu (dvojité potvrzení na klientu) — písně zůstávají (autor se vynuluje) */
function api_delete_account($U) {
    if (!$U) err('unauthenticated');
    $d = body_json();
    if (g($d, 'confirm') !== 'DELETE') err('invalid_input');
    $uid = (int)$U['id'];
    /* písně zůstávají — jen se odpojí autor */
    mysql_query("UPDATE `" . HT_PREFIX . "songs` SET author_id = 0 WHERE author_id = $uid", $GLOBALS['conn']);
    mysql_query("DELETE FROM `" . HT_PREFIX . "ratings` WHERE user_id = $uid", $GLOBALS['conn']);
    mysql_query("DELETE FROM `" . HT_PREFIX . "sessions` WHERE user_id = $uid", $GLOBALS['conn']);
    mysql_query("DELETE FROM `" . HT_PREFIX . "users` WHERE id = $uid", $GLOBALS['conn']);
    echo '{"status":"ok"}';
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
    $q = mysql_query("SELECT id, title, the_key, author_id, forked_from, published, completeness, lang, created_at, updated_at, version
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
    $title = ht_clean_title(g($d, 'title')); $data = g($d, 'data'); $key = ht_norm_key(g($d, 'key', 'F'));
    if (!$title || !ht_valid_data($data) || !ht_valid_key($key)) err('invalid_input');
    $comp = ht_completeness($data);
    $lang = ht_norm_lang(g($d, 'lang', 'CZ'));
    mysql_query("INSERT INTO `" . HT_PREFIX . "songs` (title, the_key, data, author_id, published, completeness, lang, created_at, updated_at)
                 VALUES ('" . dbq($title) . "', '" . dbq($key) . "', '" . dbq($data) . "', " . (int)$U['id'] . ", 1, '" . dbq($comp) . "', '" . dbq($lang) . "', '" . now() . "', '" . now() . "')", $GLOBALS['conn']);
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
    $key = ht_norm_key(g($d, 'key', $s['the_key']));
    if (!$title || !ht_valid_data($data) || !ht_valid_key($key)) err('invalid_input');
    save_version($s); // uložit předchozí verzi
    $nv = (int)$s['version'] + 1;
    $comp = ht_completeness($data);
    mysql_query("UPDATE `" . HT_PREFIX . "songs` SET title = '" . dbq($title) . "', the_key = '" . dbq($key) . "',
                 data = '" . dbq($data) . "', completeness = '" . dbq($comp) . "', lang = '" . dbq(ht_norm_lang(g($d, 'lang', $s['lang']))) . "', version = $nv, updated_at = '" . now() . "' WHERE id = $id", $GLOBALS['conn']);
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
    $comp = ht_completeness($s['data']);
    mysql_query("INSERT INTO `" . HT_PREFIX . "songs` (title, the_key, data, author_id, forked_from, published, completeness, lang, created_at, updated_at)
                 VALUES ('" . dbq($nt) . "', '" . dbq($s['the_key']) . "', '" . dbq($s['data']) . "',
                         " . (int)$U['id'] . ", $id, 1, '" . dbq($comp) . "', '" . dbq(ht_norm_lang($s['lang'])) . "', '" . now() . "', '" . now() . "')", $GLOBALS['conn']);
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

/* ---------- SMTP direct send (hosting mail() nefunkční; mail.don.cz:25 STARTTLS) ---------- */

function ht_smtp_cmd($sock, $cmd) {
    fwrite($sock, $cmd . "\r\n");
    $d = '';
    while (($l = fgets($sock, 515)) !== false) {
        $d .= $l;
        if (strlen($l) < 4 || $l[3] === ' ') break;
    }
    return $d;
}
function ht_smtp_expect($sock, $code) {
    $r = ht_smtp_cmd_read($sock);
    return (strpos($r, $code) === 0);
}
function ht_smtp_cmd_read($sock) {
    $d = '';
    while (($l = fgets($sock, 515)) !== false) {
        $d .= $l;
        if (strlen($l) < 4 || $l[3] === ' ') break;
    }
    return $d;
}

function ht_smtp_send($to, $subject_utf8, $body) {
    // Credentials čte se z lokálního souboru mimo webroot (chmod 600)
    $credfile = dirname(__FILE__) . '/protected/.ht-mail-cred';
    if (!is_readable($credfile)) return false;
    $cred = parse_ini_file($credfile);
    if (!$cred || empty($cred['user']) || empty($cred['pass'])) return false;
    $user = $cred['user']; $pass = $cred['pass'];
    $host = 'mail.don.cz'; $port = 25;
    $subj = '=?UTF-8?B?' . base64_encode($subject_utf8) . '?=';
    $hdrs = "From: Klepeto <$user>\r\nContent-Type: text/plain; charset=UTF-8\r\nReply-To: $user\r\n";
    $sock = @fsockopen($host, $port, $errno, $errstr, 12);
    if (!$sock) return false;
    ht_smtp_expect($sock, '220');
    ht_smtp_cmd($sock, 'EHLO heligonka.kuzelovi.cz');
    ht_smtp_expect($sock, '250');
    // AUTH LOGIN bez TLS (mx.don.cz dovoluje AUTH na plain spojení; creds jsou app-specific)
    ht_smtp_cmd($sock, 'AUTH LOGIN');
    ht_smtp_cmd($sock, base64_encode($user));
    $r = ht_smtp_cmd($sock, base64_encode($pass));
    if (strpos($r, '235') !== 0) { fclose($sock); return false; }
    ht_smtp_cmd($sock, 'MAIL FROM:<' . $user . '>');
    $rc = ht_smtp_cmd($sock, 'RCPT TO:<' . $to . '>');
    if (strpos($rc, '250') !== 0 && strpos($rc, '251') !== 0) { fclose($sock); return false; }
    ht_smtp_cmd($sock, 'DATA');
    $msg = "Subject: $subj\r\n$hdrs\r\n" . $body . "\r\n.";
    $r = ht_smtp_cmd($sock, $msg);
    ht_smtp_cmd($sock, 'QUIT');
    fclose($sock);
    return strpos($r, '250') === 0;
}
/* Vilda cílový mail pro notifikace */
define('HT_NOTIFY_TO', 'vilem@kuzelovi.cz');
function ht_notify_admin_new_user_smtp($username, $ip) {
    $body = "\nNová registrace v Heligonka Tabulator:\n\n  Uživatel:  " . $username . "\n  Čas:       " . date('j.n.Y H:i') . "\n  IP:        " . $ip . "\n\nSchválit: https://klepeto.kuzelovi.cz/heligonka/ (Admin panel)\n\n-- \nKlepeto (Heligonka Tabulator)";
    return ht_smtp_send(HT_NOTIFY_TO, 'Heligonka: nová registrace — ' . $username, $body);
}
