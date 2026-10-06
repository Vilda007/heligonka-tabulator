<?php
header("X-Powered-By:");
/* Heligonka Tabulator — db.php (PHP 5-compatible MySQL, MyISAM) */

$__conf = array();
if (is_readable('/home/vildadmin/.openclaw/credentials/kuzelovi/kuzelovi.env')) {
    foreach (file('/home/vildadmin/.openclaw/credentials/kuzelovi/kuzelovi.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $__l) {
        $__p = explode('=', $__l, 2);
        if (count($__p) === 2) $__conf[trim($__p[0])] = trim($__p[1]);
    }
}
$__host = isset($__conf['DB_HOST']) ? $__conf['DB_HOST'] : 'localhost';
$__user = isset($__conf['DB_USER']) ? $__conf['DB_USER'] : 'dev_vilda';
$__pass = isset($__conf['DB_PASS']) ? $__conf['DB_PASS'] : '';
$__db   = isset($__conf['DB_NAME']) ? $__conf['DB_NAME'] : 'dev_vilda';

$conn = @mysql_connect($__host, $__user, $__pass);
if (!$conn) { echo '{"status":"error","code":"db_connect_failed"}'; exit; }
mysql_select_db($__db, $conn);
mysql_query("SET NAMES utf8", $conn);

define('HT_PREFIX', 'klepeto_ht_');

function dbq($s) { return mysql_real_escape_string($s, $GLOBALS['conn']); }

function jout($arr) { echo jt_json($arr); }

function ensure_tables() {
    mysql_query("CREATE TABLE IF NOT EXISTS `" . HT_PREFIX . "users` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        pass_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'reader',
        approved INT NOT NULL DEFAULT 0,
        created_at VARCHAR(30)
    ) TYPE=MyISAM");

    mysql_query("CREATE TABLE IF NOT EXISTS `" . HT_PREFIX . "sessions` (
        sid VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        created_at VARCHAR(30)
    ) TYPE=MyISAM");

    mysql_query("CREATE TABLE IF NOT EXISTS `" . HT_PREFIX . "songs` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        the_key VARCHAR(5) NOT NULL DEFAULT 'F',
        data TEXT,
        author_id INT NOT NULL,
        forked_from INT DEFAULT NULL,
        version INT NOT NULL DEFAULT 1,
        published INT NOT NULL DEFAULT 0,
        created_at VARCHAR(30),
        updated_at VARCHAR(30)
    ) TYPE=MyISAM");

    mysql_query("CREATE TABLE IF NOT EXISTS `" . HT_PREFIX . "song_versions` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        song_id INT NOT NULL,
        version INT NOT NULL,
        the_key VARCHAR(5),
        data TEXT,
        author_id INT,
        created_at VARCHAR(30)
    ) TYPE=MyISAM");

    mysql_query("CREATE TABLE IF NOT EXISTS `" . HT_PREFIX . "ratings` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        song_id INT NOT NULL,
        user_id INT NOT NULL,
        stars INT NOT NULL,
        created_at VARCHAR(30)
    ) TYPE=MyISAM");
}
ensure_tables();

function session_get_user($sid) {
    // sessions starší 24 h neplatné
    mysql_query("DELETE FROM `". HT_PREFIX . "sessions` WHERE created_at < '" . date('Y-m-d H:i:s', time() - 86400) . "'", $GLOBALS['conn']);
    $q = mysql_query("SELECT u.* FROM `" . HT_PREFIX . "users` u, `" . HT_PREFIX . "sessions` s WHERE s.user_id = u.id AND s.sid = '" . dbq($sid) . "'", $GLOBALS['conn']);
    if (!$q) return false;
    $row = mysql_fetch_assoc($q);
    if (!$row) return false;
    return $row;
}

function err($code) { echo '{"status":"error","code":"' . $code . '"}'; exit; }
function require_role($U, $min) {
    $order = array('reader' => 1, 'editor' => 2, 'admin' => 3);
    if (!$U) err('unauthenticated');
    if ($order[$U['role']] < $order[$min]) err('forbidden');
}
/* PHP 4.3.8-safe JSON encoder (recursive; replaces json_encode which is absent) */
function jt_json($v) {
    if (is_null($v)) return 'null';
    if (is_bool($v)) return $v ? 'true' : 'false';
    if (is_int($v) || is_float($v)) return strval($v);
    if (is_string($v)) return '"' . jt_esc($v) . '"';
    if (is_array($v)) {
        $isList = true; $i = 0;
        foreach (array_keys($v) as $k) { if ($k !== $i) { $isList = false; break; } $i++; }
        $parts = array();
        if ($isList) {
            foreach ($v as $item) $parts[] = jt_json($item);
            return '[' . implode(',', $parts) . ']';
        }
        foreach ($v as $k => $item) $parts[] = '"' . jt_esc(strval($k)) . '":' . jt_json($item);
        return '{' . implode(',', $parts) . '}';
    }
    return 'null';
}
function jt_esc($s) {
    $s = str_replace('\\', '\\\\', $s);
    $s = str_replace('"', '\\"', $s);
    $s = str_replace("\r", '\\r', $s);
    $s = str_replace("\n", '\\n', $s);
    $s = str_replace("\t", '\\t', $s);
    $out = ''; $len = strlen($s);
    for ($i = 0; $i < $len; $i++) {
        $c = ord($s[$i]);
        if ($c < 32) $out .= sprintf('\\u%04x', $c); else $out .= $s[$i];
    }
    return $out;
}

/* PHP4-safe minimal JSON decoder (objects→assoc arrays, arrays→lists; enough for our posts) */
function jt_json_decode($raw) {
    $raw = trim(strval($raw));
    if ($raw === '') return null;
    $data = stripslashes_safe_pairs($raw);
    // Extract "key":"value" and "key":number/bool/null pairs
    $out = array();
    if (preg_match_all('/"((?:[^"\\\\]|\\\\.)+)"\s*:\s*("?(?:[^",{}\\[\\]]*)"?)\s*[,}]/U', $data, $m, PREG_SET_ORDER)) {
        foreach ($m as $pair) {
            $k = jt_unescape($pair[1]);
            $v = $pair[2];
            $v = trim($v);
            if ($v === 'true') $out[$k] = true;
            elseif ($v === 'false') $out[$k] = false;
            elseif ($v === 'null') $out[$k] = null;
            elseif (strlen($v) >= 2 && $v[0] == '"') $out[$k] = jt_unescape(substr($v, 1, -1));
            elseif (is_numeric($v)) $out[$k] = $v + 0;
            else $out[$k] = $v;
        }
    }
    return count($out) ? $out : null;
}
function stripslashes_safe_pairs($s) { return $s; }
/* \uXXXX → UTF-8 (JSON unicode escape) */
function jt_utf8_from_hex($m) {
    $cp = hexdec($m[1]);
    if ($cp < 0x80) return chr($cp);
    if ($cp < 0x800) return chr(0xC0 | ($cp >> 6)) . chr(0x80 | ($cp & 0x3F));
    if ($cp < 0x10000) return chr(0xE0 | ($cp >> 12)) . chr(0x80 | (($cp >> 6) & 0x3F)) . chr(0x80 | ($cp & 0x3F));
    return chr(0xF0 | ($cp >> 18)) . chr(0x80 | (($cp >> 12) & 0x3F)) . chr(0x80 | (($cp >> 6) & 0x3F)) . chr(0x80 | ($cp & 0x3F));
}
function jt_unescape($s) {
    $s = str_replace('\\\\', "\x01", $s);
    $s = str_replace('\\"', '"', $s);
    $s = str_replace('\\n', "\n", $s);
    $s = str_replace('\\r', "\r", $s);
    $s = str_replace('\\t', "\t", $s);
    $s = preg_replace_callback('/\\\\u([0-9a-fA-F]{4})/', 'jt_utf8_from_hex', $s);
    $s = str_replace("\x01", '\\', $s);
    return $s;
}

/* ================= SECURITY LAYER (6.10.2026) ================= */

/* Response hardening headers (call at top of every JSON path) */
function ht_sec_headers() {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header('Cache-Control: no-store');
}

/* --- input validators --- */
function ht_valid_username($u) {
    return is_string($u) && preg_match('/^[a-zA-Z0-9_.\-]{3,50}$/', $u);
}
function ht_valid_password($p) {
    return is_string($p) && strlen($p) >= 6 && strlen($p) <= 200;
}
function ht_valid_key($k) {
    return in_array(ht_norm_key($k), array('F','C','G','A','D','Bb'), true);
}
/* normalizace tóniny: 'bb'/'BB' → 'Bb', ostatní uppercase */
function ht_norm_key($k) {
    $k = strtoupper(strval($k));
    if ($k === 'BB') return 'Bb';
    return $k;
}
/* data (píseň): text, sane size limit 200 KB */
function ht_valid_data($data) {
    return is_string($data) && strlen($data) <= 200 * 1024;
}
/* title: strip control chars, cap 200 chars */
function ht_clean_title($t) {
    $t = is_string($t) ? $t : '';
    $t = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $t);
    return substr($t, 0, 200);
}
/* LIKE wildcard escape (search je DB-quouted už přes dbq, %/_ navíc escapujeme) */
function ht_like($t) {
    $t = str_replace(array('%', '_'), array('\%', '\_'), $t);
    return dbq($t);
}

/* --- login rate limiting --- */
function ht_rate_check($action, $ident) {
    mysql_query("CREATE TABLE IF NOT EXISTS `" . HT_PREFIX . "rate` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        r_action VARCHAR(32) NOT NULL,
        ident VARCHAR(128) NOT NULL,
        ts VARCHAR(30) NOT NULL
    ) TYPE=MyISAM");
    $window = (int)(time() - 300); // 5 minut
    // ident = username + IP (proxy-safe)
    $ip = isset($_SERVER['HTTP_X_REAL_IP']) ? $_SERVER['HTTP_X_REAL_IP']
        : (isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? trim(array_shift(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']))) : @$GLOBALS['__REMOTE_FALLBACK']);
    if (!$ip) $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    $key = substr($ident . '|' . $ip, 0, 128);
    $q = mysql_query("SELECT COUNT(*) c FROM `" . HT_PREFIX . "rate`
                      WHERE r_action = '" . dbq($action) . "' AND ident = '" . dbq($key) . "'
                      AND ts > '" . $window . "'", $GLOBALS['conn']);
    $c = (int)mysql_result($q, 0, 0);
    if ($c >= 10) err('rate_limited');
}
function ht_rate_hit($action, $ident) {
    $ip = isset($_SERVER['HTTP_X_REAL_IP']) ? $_SERVER['HTTP_X_REAL_IP']
        : (isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? trim(array_shift(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']))) : '');
    if (!$ip) $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    $key = substr($ident . '|' . $ip, 0, 128);
    mysql_query("INSERT INTO `" . HT_PREFIX . "rate` (r_action, ident, ts) VALUES ('" . dbq($action) . "', '" . dbq($key) . "', '" . time() . "')", $GLOBALS['conn']);
    mysql_query("DELETE FROM `" . HT_PREFIX . "rate` WHERE ts < '" . (int)(time() - 3600) . "'", $GLOBALS['conn']);
}
/* úspěšný login vymaže počítadlo */
function ht_rate_clear($action, $ident) {
    $ip = isset($_SERVER['HTTP_X_REAL_IP']) ? $_SERVER['HTTP_X_REAL_IP']
        : (isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? trim(array_shift(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']))) : '');
    if (!$ip) $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    mysql_query("DELETE FROM `" . HT_PREFIX . "rate` WHERE r_action = '" . dbq($action) . "' AND ident LIKE '" . dbq(substr($ident, 0, 50)) . "|%'", $GLOBALS['conn']);
}

/* --- session expiry (24 h) --- */
function ht_is_string($v){ return is_string($v); }
