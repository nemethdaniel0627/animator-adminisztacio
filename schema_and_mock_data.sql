-- ============================================================================
-- Animátor Közösség Adminisztrációs Rendszer (anim_uj)
-- Teljes Adatbázis Séma és Tesztadatok (Mock Data)
-- Kompatibilitás: MySQL 5.7+, MySQL 8.0+, MariaDB, TiDB Cloud, Aiven, phpMyAdmin
-- Karakterkészlet: utf8mb4 / utf8mb4_unicode_ci (magyar ékezetek támogatása)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Adatbázis létrehozása (ha még nem létezik)
CREATE DATABASE IF NOT EXISTS `anim_uj` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `anim_uj`;

-- ============================================================================
-- TÁBLÁK TÖRLÉSE (Fordított függőségi sorrendben)
-- ============================================================================
DROP TABLE IF EXISTS `statuszujitas_kerelem`;
DROP TABLE IF EXISTS `statuszujitas_config`;
DROP TABLE IF EXISTS `pozicio`;
DROP TABLE IF EXISTS `jelenlet`;
DROP TABLE IF EXISTS `esemeny`;
DROP TABLE IF EXISTS `animator`;

-- ============================================================================
-- 1. TÁBLA: animator (Animátorok névsora és adatai)
-- ============================================================================
CREATE TABLE `animator` (
  `animator_ID` INT(11) NOT NULL,
  `nev` VARCHAR(100) NOT NULL COMMENT 'Animátor teljes neve',
  `shibboleth` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Egyetemi Shibboleth SSO azonosító',
  `kategoria` VARCHAR(50) DEFAULT 'junior' COMMENT 'Kategória: junior, senior, jelölt',
  `statusz` VARCHAR(50) DEFAULT 'aktív' COMMENT 'Státusz: aktív, passzív, ifjú, veterán, vén, inaktív',
  `email` VARCHAR(150) DEFAULT NULL COMMENT 'E-mail cím',
  `telefonszam` VARCHAR(50) DEFAULT NULL COMMENT 'Telefonszám',
  `password` VARCHAR(255) DEFAULT 'test1234' COMMENT 'Bejelentkezési jelszó',
  PRIMARY KEY (`animator_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. TÁBLA: esemeny (Események, gyűlések, tréningek)
-- ============================================================================
CREATE TABLE `esemeny` (
  `esemeny_ID` INT(11) NOT NULL AUTO_INCREMENT,
  `cim` VARCHAR(100) NOT NULL COMMENT 'Esemény megnevezése',
  `datum` DATETIME NOT NULL COMMENT 'Esemény időpontja',
  `tipus` VARCHAR(50) NOT NULL COMMENT '7 standard típus: egyetemi rendezvény, nagyrendezvény, egyéb, státuszújítás, tisztújítás, közgyűlés, tréning',
  PRIMARY KEY (`esemeny_ID`),
  INDEX `idx_datum` (`datum`),
  INDEX `idx_tipus` (`tipus`)
) ENGINE=InnoDB AUTO_INCREMENT=763 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. TÁBLA: jelenlet (Jelenléti ív kapcsolat az animátorok és események között)
-- ============================================================================
CREATE TABLE `jelenlet` (
  `jelenlet_ID` INT(11) NOT NULL AUTO_INCREMENT,
  `animator_ID` INT(11) NOT NULL,
  `esemeny_ID` INT(11) NOT NULL,
  PRIMARY KEY (`jelenlet_ID`),
  UNIQUE KEY `uk_esemeny_animator` (`esemeny_ID`, `animator_ID`),
  INDEX `idx_animator` (`animator_ID`),
  CONSTRAINT `fk_jelenlet_animator` FOREIGN KEY (`animator_ID`) REFERENCES `animator` (`animator_ID`) ON DELETE CASCADE,
  CONSTRAINT `fk_jelenlet_esemeny` FOREIGN KEY (`esemeny_ID`) REFERENCES `esemeny` (`esemeny_ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17709 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. TÁBLA: pozicio (Tisztújításokon választott pozíciók / Admin jogosultság)
-- ============================================================================
CREATE TABLE `pozicio` (
  `pozicio_ID` INT(11) NOT NULL AUTO_INCREMENT,
  `animator_ID` INT(11) NOT NULL,
  `esemeny_ID` INT(11) NOT NULL COMMENT 'A tisztújítás esemény ID-ja',
  `pozicio` VARCHAR(100) NOT NULL COMMENT 'pl. Elnök, Gazdasági felelős, Volt Elnök',
  PRIMARY KEY (`pozicio_ID`),
  INDEX `idx_pozicio_animator` (`animator_ID`),
  INDEX `idx_pozicio_esemeny` (`esemeny_ID`),
  CONSTRAINT `fk_pozicio_animator` FOREIGN KEY (`animator_ID`) REFERENCES `animator` (`animator_ID`) ON DELETE CASCADE,
  CONSTRAINT `fk_pozicio_esemeny` FOREIGN KEY (`esemeny_ID`) REFERENCES `esemeny` (`esemeny_ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. TÁBLA: statuszujitas_config (Éves periódus beállításai)
-- ============================================================================
CREATE TABLE `statuszujitas_config` (
  `config_ID` INT(11) NOT NULL AUTO_INCREMENT,
  `ev` INT(11) NOT NULL DEFAULT 2026,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = aktív periódus, 0 = inaktív',
  `start_date` DATE NOT NULL COMMENT 'Periódus kezdete (YYYY-MM-DD)',
  `end_date` DATE NOT NULL COMMENT 'Periódus vége (YYYY-MM-DD)',
  PRIMARY KEY (`config_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. TÁBLA: statuszujitas_kerelem (Beküldött kérelmek és döntések)
-- ============================================================================
CREATE TABLE `statuszujitas_kerelem` (
  `kerelem_ID` INT(11) NOT NULL AUTO_INCREMENT,
  `animator_ID` INT(11) NOT NULL,
  `igenyelt_statusz` VARCHAR(50) NOT NULL COMMENT 'Aktív, Passzív, Veterán, Vén, Ex',
  `indoklas` TEXT DEFAULT NULL COMMENT 'MessageBox indoklás hiányzó feltétel esetén',
  `submitted_at` DATETIME DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'fuggoben' COMMENT 'fuggoben | elbirálva',
  `megadott_statusz` VARCHAR(50) DEFAULT NULL COMMENT 'Vezetőség által jóváhagyott státusz',
  `dontes_datum` DATETIME DEFAULT NULL,
  PRIMARY KEY (`kerelem_ID`),
  UNIQUE KEY `uk_kerelem_animator` (`animator_ID`),
  CONSTRAINT `fk_kerelem_animator` FOREIGN KEY (`animator_ID`) REFERENCES `animator` (`animator_ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- TESZTADATOK FELTÖLTÉSE (MOCK DATA INSERTS)
-- ============================================================================
START TRANSACTION;

-- 1. Animátorok feltöltése
-- Szabály: Németh Dániel = Elnök / Admin; mindenki más = alap aktív animátor, jelszó: test1234
INSERT INTO `animator` (`animator_ID`, `nev`, `shibboleth`, `kategoria`, `statusz`, `email`, `telefonszam`, `password`) VALUES
(1001, 'Németh Dániel', 'nemeth.daniel', 'senior', 'aktív', 'nem.dani0627@gmail.com', '+36 308-334589', 'test1234'),
(883, 'Bolla Péter', 'bolla.peter', 'senior', 'aktív', 'bolla.peter@animator.hu', '+36 30 123 4567', 'test1234'),
(963, 'Széwald Péter Tamás', 'szewald.peter', 'junior', 'aktív', 'szewald.peter@animator.hu', '+36 30 234 5678', 'test1234'),
(745, 'Kovács Anna', 'kovacs.anna', 'jelölt', 'aktív', 'kovacs.anna@animator.hu', '+36 30 345 6789', 'test1234'),
(812, 'Nagy Bence', 'nagy.bence', 'senior', 'aktív', 'nagy.bence@animator.hu', '+36 30 456 7890', 'test1234'),
(904, 'Tóth Zsófia', 'toth.zsofia', 'junior', 'aktív', 'toth.zsofia@animator.hu', '+36 30 567 8901', 'test1234'),
(670, 'Balogh Márton', 'balogh.marton', 'senior', 'aktív', 'balogh.marton@animator.hu', '+36 30 678 9012', 'test1234'),
(720, 'Horváth Eszter', 'horvath.eszter', 'junior', 'aktív', 'horvath.eszter@animator.hu', '+36 30 789 0123', 'test1234'),
(915, 'Kiss István', 'kiss.istvan', 'junior', 'aktív', 'kiss.istvan@animator.hu', '+36 30 890 1234', 'test1234'),
(928, 'Varga Máté', 'varga.mate', 'senior', 'aktív', 'varga.mate@animator.hu', '+36 30 901 2345', 'test1234'),
(1010, 'Szabó Vivien Barbara', 'szabo.vivien', 'senior', 'aktív', 'szabo.vivien@animator.hu', '+36 30 111 2233', 'test1234'),
(1011, 'Kellermann Kinga', 'kellermann.kinga', 'senior', 'aktív', 'kellermann.kinga@animator.hu', '+36 30 222 3344', 'test1234'),
(1012, 'Mészáros Kinga', 'meszaros.kinga', 'junior', 'aktív', 'meszaros.kinga@animator.hu', '+36 30 333 4455', 'test1234'),
(1013, 'Szabó József', 'szabo.jozsef', 'senior', 'aktív', 'szabo.jozsef@animator.hu', '+36 30 444 5566', 'test1234'),
(1014, 'Trencsik Markó', 'trencsik.marko', 'senior', 'aktív', 'trencsik.marko@animator.hu', '+36 30 555 6677', 'test1234'),
(1015, 'Aszódi Boglárka', 'aszodi.boglarka', 'junior', 'aktív', 'aszodi.boglarka@animator.hu', '+36 30 666 7788', 'test1234');

-- 2. Események feltöltése
INSERT INTO `esemeny` (`esemeny_ID`, `cim`, `datum`, `tipus`) VALUES
(710, 'Tisztújítás 2025', '2025-11-13 18:00:00', 'tisztújítás'),
(711, 'Tisztújító Közgyűlés', '2025-11-13 18:00:00', 'közgyűlés'),
(752, 'Közgyűlés', '2025-12-17 18:00:00', 'közgyűlés'),
(753, 'Státuszújítás 2026', '2026-02-12 18:00:00', 'státuszújítás'),
(754, 'Tisztújítás 2026', '2026-02-13 18:00:00', 'tisztújítás'),
(755, 'Képzés', '2026-04-26 14:00:00', 'tréning'),
(756, 'Közgyűlés', '2026-05-21 18:00:00', 'közgyűlés'),
(757, 'Gólyatábor', '2026-07-11 08:00:00', 'nagyrendezvény'),
(758, 'Gólyanapok', '2026-08-28 09:00:00', 'egyetemi rendezvény'),
(759, 'Közgyűlés', '2026-09-08 18:00:00', 'közgyűlés'),
(760, 'Büfé tréning', '2026-10-10 16:00:00', 'tréning'),
(761, 'Vezetőségi tréning', '2026-10-13 17:00:00', 'tréning'),
(762, 'Pázmány nap', '2026-10-14 10:00:00', 'egyetemi rendezvény');

-- 3. Jelenlétek feltöltése
INSERT INTO `jelenlet` (`jelenlet_ID`, `animator_ID`, `esemeny_ID`) VALUES
(17626, 1001, 757),
(17627, 1001, 759),
(17628, 1001, 760),
(17629, 1001, 761),
(17701, 883, 759),
(17702, 883, 756),
(17703, 883, 758),
(17704, 883, 757),
(17705, 883, 761),
(17706, 745, 759),
(17707, 745, 758),
(17708, 745, 761);

-- 4. Pozíciók feltöltése
-- A legutolsó tisztújítás (754) adja az adminisztrátori jogot. Kizárólag Németh Dániel adminisztrátor!
INSERT INTO `pozicio` (`pozicio_ID`, `animator_ID`, `esemeny_ID`, `pozicio`) VALUES
(1, 1001, 754, 'Elnök'),
(3, 670, 710, 'Volt Elnök'),
(4, 1001, 710, 'Elnök');

-- 5. Státuszújítás időszak beállítása
INSERT INTO `statuszujitas_config` (`config_ID`, `ev`, `is_active`, `start_date`, `end_date`) VALUES
(1, 2026, 1, '2026-10-30', '2026-11-02');

-- 6. Státuszújítási mintakérelmek
INSERT INTO `statuszujitas_kerelem` (`kerelem_ID`, `animator_ID`, `igenyelt_statusz`, `indoklas`, `submitted_at`, `status`, `megadott_statusz`, `dontes_datum`) VALUES
(1, 883, 'Aktív', 'Minden feltételt sikeresen teljesítettem, szeretném folytatni az aktív animátori munkát.', '2026-02-01 14:22:00', 'fuggoben', 'Aktív', NULL),
(2, 745, 'Aktív', 'Az őszi közgyűlés idején külföldi tanulmányi versenyen voltam, ezért nem tudtam jelen lenni. A tavaszi félévben vállalok plusz feladatokat a pótlásra.', '2026-02-05 18:40:00', 'fuggoben', 'Aktív', NULL);

COMMIT;

-- ============================================================================
-- SIKERES TELEPÍTÉS ELLENŐRZÉSE
-- ============================================================================
SELECT 'animator' AS tabla, COUNT(*) AS sorok_szama FROM `animator`
UNION ALL
SELECT 'esemeny', COUNT(*) FROM `esemeny`
UNION ALL
SELECT 'jelenlet', COUNT(*) FROM `jelenlet`
UNION ALL
SELECT 'pozicio', COUNT(*) FROM `pozicio`
UNION ALL
SELECT 'statuszujitas_config', COUNT(*) FROM `statuszujitas_config`
UNION ALL
SELECT 'statuszujitas_kerelem', COUNT(*) FROM `statuszujitas_kerelem`;

