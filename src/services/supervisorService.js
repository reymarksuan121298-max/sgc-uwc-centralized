/**
 * Supervisor Service
 * Fetches, filters, and resolves supervisor mappings per sub-office (e.g. ILIGAN SET A/B from stl-ldn-api.com).
 */
import { proxyFetch } from './proxyClient.js';

// ─── ILIGAN SET B ────────────────────────────────────────────────────────────
export const ILIGAN_ALLOWED_SUPERVISORS = [
  "jasonmabini@gfldn",
  "jessentpizon@gfldn",
  "jacksonslimpangog@gfldn",
  "rielmpizon@gfldn",
  "ianjohnmbalala@gfldn",
  "ivankennethg.agcopra@gfldn",
  "coor@gfldn"
];

// ─── ILIGAN SET A ────────────────────────────────────────────────────────────
// Whitelist of authorized ILIGAN SET A supervisors (from ?id=5 and ?id=8)
export const ILIGAN_SET_A_ALLOWED_SUPERVISORS = [
  // From supervisor?id=8
  "edmondgonzaga@gfldn",
  "steverodriguez@gfldn",
  // From supervisor?id=5
  "camilojayminoza@gfldn",
  "cristianagaton@gfldn",
  "clintdarylbalansag@gfldn",
  "edgardocainglesjr@gfldn",
  "jasonamen@gfldn",
  "erluarboladura@gfldn",
  "frexyniesbacalso@gfldn",
  "hectorcandole@gfldn",
  "isaganipaculba@gfldn",
  "jesustitodonato@gfldn",
  "jetmichaeldonato@gfldn",
  "joelordona@gfldn",
  "junriemorales@gfldn",
  "patrickchiong@gfldn",
  "johnstephgorres@gfldn",
  "arnoldabitona@gfldn",
  "navexyrilhotilla@gfldn",
  "regiemorales@gfldn",
  "marlontautoan@gfldn",
  "annesumile@gfldn",
  "mubaraktomanor@gfldn",
  "amirodingmaba@gfldn"
];

// ─── LALA OFFICE (id=2) ──────────────────────────────────────────────────────
export const LALA_OFFICE_ALLOWED_SUPERVISORS = [
  "archiefernandez@gfldn",
  "melvinlimbaga@gfldn",
  "noelordonez@gfldn",
  "jasongaudiano@gfldn",
  "jetpepito@gfldn",
  "roelluab@gfldn",
  "alindaalingan@gfldn",
  "odencampong@gfldn",
  "alancaralos@gfldn",
  "jovanfernandez@gfldn",
  "marjohndelacerna@gfldn",
  "rutherdelacerna@gfldn",
  "andyvicabias@gfldn",
  "jeffreybaguio@gfldn",
  "daveasidor@gfldn",
  "nadermasauna@gfldn",
  "faisalmacabato@gfldn",
  "froilanbuhisan@gfldn",
  "jamesmarlonlucot@gfldn",
  "jovenillodayle@gfldn",
  "dextheralandroque@gfldn",
  "labador@gfldn",
  "honeyclearlumantas@gfldn",
  "kissiemontero@gfldn"
];
// ─── BALOI OFFICE (id=6) ─────────────────────────────────────────────────────
export const BALOI_OFFICE_ALLOWED_SUPERVISORS = [
  "jaysalac@gfldn",
  "mapantasmala@gfldn",
  "alisamagondacan@gfldn",
  "acmadpalo@gfldn",
  "fatimamarieobillos@gfldn",
  "ivankennethagcopra@gfldn",
  "agentsundercoor@gfldn",
  "ianjohnbalala@gfldn",
  "rielpizon@gfldn",
  "jacksonlimpangog@gfldn"
];

// ─── LANDASAN OFFICE ─────────────────────────────────────────────────────────
export const LANDASAN_ALLOWED_SUPERVISORS = [
  "parang-spvr-nelson"
];

/**
 * Checks if a supervisor belongs to LANDASAN OFFICE.
 * Strictly allows only supervisor PARANG-SPVR-NELSON.
 * @param {string|Object} itemOrKey
 * @returns {boolean}
 */
export function isLandasanOfficeAllowedSupervisor(itemOrKey) {
  if (!itemOrKey) return false;

  const candidates = typeof itemOrKey === 'object'
    ? [
      itemOrKey.supervisor,
      itemOrKey.username,
      itemOrKey.user,
      itemOrKey.supervisor_name,
      itemOrKey.supervisorName,
      itemOrKey.spvr
    ].filter(Boolean).map(s => String(s).toLowerCase().trim())
    : [String(itemOrKey).toLowerCase().trim()];

  return candidates.some(clean => {
    return LANDASAN_ALLOWED_SUPERVISORS.some(allowed => {
      const a = allowed.toLowerCase();
      const prefix = a.split('@')[0];
      return clean === a ||
        clean === prefix ||
        clean.startsWith(prefix) ||
        clean.includes('parang-spvr-nelson') ||
        clean.includes('spvr-nelson') ||
        (clean.includes('nelson') && clean.includes('parang')) ||
        clean === 'nelson';
    });
  });
}

// ─── PARANG SUB OFFICE ───────────────────────────────────────────────────────
export const PARANG_ALLOWED_SUPERVISORS = [
  "parang-spvr-rodelito",
  "parang-spvr-reymark",
  "parang-spvr-jonathan"
];

/**
 * Checks if a supervisor belongs to PARANG SUB OFFICE.
 * Strictly allows only supervisors PARANG-SPVR-RODELITO, PARANG-SPVR-REYMARK, PARANG-SPVR-JONATHAN.
 * @param {string|Object} itemOrKey
 * @returns {boolean}
 */
export function isParangOfficeAllowedSupervisor(itemOrKey) {
  if (!itemOrKey) return false;

  const candidates = typeof itemOrKey === 'object'
    ? [
      itemOrKey.supervisor,
      itemOrKey.username,
      itemOrKey.user,
      itemOrKey.supervisor_name,
      itemOrKey.supervisorName,
      itemOrKey.spvr
    ].filter(Boolean).map(s => String(s).toLowerCase().trim())
    : [String(itemOrKey).toLowerCase().trim()];

  return candidates.some(clean => {
    return PARANG_ALLOWED_SUPERVISORS.some(allowed => {
      const a = allowed.toLowerCase();
      const prefix = a.split('@')[0];
      const namePart = prefix.replace(/^parang-spvr-/, '').replace(/^spvr-/, '');
      return clean === a ||
        clean === prefix ||
        clean.startsWith(prefix) ||
        clean.includes(prefix) ||
        clean.includes(`spvr-${namePart}`) ||
        (clean.includes(namePart) && clean.includes('parang')) ||
        clean === namePart;
    });
  });
}

// ─── N-KABUNTALAN SUB OFFICE ─────────────────────────────────────────────────
export const NKABUNTALAN_ALLOWED_SUPERVISORS = [
  "nkabuntalan-spvr-rowel"
];

/**
 * Checks if a supervisor belongs to N-KABUNTALAN SUB OFFICE.
 * Strictly allows only supervisor NKABUNTALAN-SPVR-ROWEL.
 * @param {string|Object} itemOrKey
 * @returns {boolean}
 */
export function isNKabuntalanOfficeAllowedSupervisor(itemOrKey) {
  if (!itemOrKey) return false;

  const candidates = typeof itemOrKey === 'object'
    ? [
      itemOrKey.supervisor,
      itemOrKey.username,
      itemOrKey.user,
      itemOrKey.supervisor_name,
      itemOrKey.supervisorName,
      itemOrKey.spvr
    ].filter(Boolean).map(s => String(s).toLowerCase().trim())
    : [String(itemOrKey).toLowerCase().trim()];

  return candidates.some(clean => {
    return NKABUNTALAN_ALLOWED_SUPERVISORS.some(allowed => {
      const a = allowed.toLowerCase();
      const prefix = a.split('@')[0];
      return clean === a ||
        clean === prefix ||
        clean.startsWith(prefix) ||
        clean.includes('nkabuntalan-spvr-rowel') ||
        clean.includes('n-kabuntalan-spvr-rowel') ||
        clean.includes('spvr-rowel') ||
        (clean.includes('rowel') && (clean.includes('kabuntalan') || clean.includes('nkabuntalan') || clean.includes('n-kabuntalan'))) ||
        clean === 'rowel';
    });
  });
}

// ─── NORTH UPI SUB OFFICE ────────────────────────────────────────────────────
export const NORTH_UPI_ALLOWED_SUPERVISORS = [
  "upi-spvr-joevert",
  "upi-spvr-livelo",
  "upi-spvr-armando",
  "upi-spvr-wilboren",
  "upi-spvr-pasawiran",
  "dbs-spvr-kinimi-ago",
  "dbs-spvr-ago",
  "upi-spvr-mosher/bai",
  "upi-spvr-mosher-bai",
  "upi-spvr-mosher",
  "upi-spvr-ken",
  "upi-spvr-galinato",
  "upi-spvr-cedric"
];

/**
 * Checks if a supervisor belongs to NORTH UPI SUB OFFICE.
 * Strictly allows only North Upi supervisors (Joevert, Livelo, Armando, Wilboren, Pasawiran, Kinimi-Ago, Ago, Mosher/Bai, Ken, Galinato, Cedric).
 * @param {string|Object} itemOrKey
 * @returns {boolean}
 */
export function isNorthUpiOfficeAllowedSupervisor(itemOrKey) {
  if (!itemOrKey) return false;

  const candidates = typeof itemOrKey === 'object'
    ? [
      itemOrKey.supervisor,
      itemOrKey.username,
      itemOrKey.user,
      itemOrKey.supervisor_name,
      itemOrKey.supervisorName,
      itemOrKey.spvr
    ].filter(Boolean).map(s => String(s).toLowerCase().trim())
    : [String(itemOrKey).toLowerCase().trim()];

  return candidates.some(clean => {
    return NORTH_UPI_ALLOWED_SUPERVISORS.some(allowed => {
      const a = allowed.toLowerCase();
      const prefix = a.split('@')[0];
      const namePart = prefix.replace(/^upi-spvr-/, '').replace(/^dbs-spvr-/, '').replace(/^spvr-/, '');
      return clean === a ||
        clean === prefix ||
        clean.startsWith(prefix) ||
        clean.includes(prefix) ||
        clean.includes(`spvr-${namePart}`) ||
        (clean.includes(namePart) && (clean.includes('upi') || clean.includes('dbs'))) ||
        clean === namePart;
    });
  });
}

// ─── SOUTH UPI SUB OFFICE ────────────────────────────────────────────────────
export const SOUTH_UPI_ALLOWED_SUPERVISORS = [
  "upi-spvr-guiamad",
  "southupi-spvr-asrap",
  "spvr-valdez-southupi",
  "southupi-spvr-lu",
  "southupi-spvr-roland",
  "southupi-spvr-mark",
  "southupi-spvr-rommel"
];

/**
 * Checks if a supervisor belongs to SOUTH UPI SUB OFFICE.
 * Strictly allows only South Upi supervisors (Guiamad, Asrap, Valdez, Lu, Roland, Mark, Rommel).
 * @param {string|Object} itemOrKey
 * @returns {boolean}
 */
export function isSouthUpiOfficeAllowedSupervisor(itemOrKey) {
  if (!itemOrKey) return false;

  const candidates = typeof itemOrKey === 'object'
    ? [
      itemOrKey.supervisor,
      itemOrKey.username,
      itemOrKey.user,
      itemOrKey.supervisor_name,
      itemOrKey.supervisorName,
      itemOrKey.spvr
    ].filter(Boolean).map(s => String(s).toLowerCase().trim())
    : [String(itemOrKey).toLowerCase().trim()];

  return candidates.some(clean => {
    return SOUTH_UPI_ALLOWED_SUPERVISORS.some(allowed => {
      const a = allowed.toLowerCase();
      const prefix = a.split('@')[0];
      const namePart = prefix
        .replace(/^southupi-spvr-/, '')
        .replace(/^upi-spvr-/, '')
        .replace(/^spvr-/, '')
        .replace(/-southupi$/, '');
      return clean === a ||
        clean === prefix ||
        clean.startsWith(prefix) ||
        clean.includes(prefix) ||
        clean.includes(`spvr-${namePart}`) ||
        (clean.includes(namePart) && (clean.includes('upi') || clean.includes('south'))) ||
        clean === namePart;
    });
  });
}

// ─── DOS/AWANG OFFICE ────────────────────────────────────────────────────────
export const DOS_AWANG_ALLOWED_SUPERVISORS = [
  "dos/awang-spvr-ramsie",
  "dos-awang-spvr-ramsie",
  "dos/awang-spvr-lorenzo",
  "dos-awang-spvr-lorenzo",
  "dos/awang-spvr-jonny",
  "dos-awang-spvr-jonny",
  "dos/awang-spvr-marlon",
  "dos-awang-spvr-marlon",
  "dos/awang-spvr-harif",
  "dos-awang-spvr-harif"
];

/**
 * Checks if a supervisor belongs to DOS/AWANG OFFICE.
 * Strictly allows only Dos/Awang supervisors:
 * DOS/AWANG-SPVR-RAMSIE, DOS/AWANG-SPVR-LORENZO, DOS/AWANG-SPVR-JONNY, DOS/AWANG-SPVR-MARLON, DOS/AWANG-SPVR-HARIF.
 * @param {string|Object} itemOrKey
 * @returns {boolean}
 */
export function isDosAwangOfficeAllowedSupervisor(itemOrKey) {
  if (!itemOrKey) return false;

  const candidates = typeof itemOrKey === 'object'
    ? [
      itemOrKey.supervisor,
      itemOrKey.username,
      itemOrKey.user,
      itemOrKey.supervisor_name,
      itemOrKey.supervisorName,
      itemOrKey.spvr
    ].filter(Boolean).map(s => String(s).toLowerCase().trim())
    : [String(itemOrKey).toLowerCase().trim()];

  return candidates.some(clean => {
    // Prevent collision with Baloi/Iligan supervisors (Marlon Tautoan, James Marlon Lucot)
    if (clean.includes('tautoan') || clean.includes('lucot')) return false;

    return DOS_AWANG_ALLOWED_SUPERVISORS.some(allowed => {
      const a = allowed.toLowerCase();
      const prefix = a.split('@')[0];
      const namePart = prefix
        .replace(/^dos\/awang-spvr-/, '')
        .replace(/^dos-awang-spvr-/, '')
        .replace(/^awang-spvr-/, '')
        .replace(/^spvr-/, '');
      return clean === a ||
        clean === prefix ||
        clean.startsWith(prefix) ||
        clean.includes(prefix) ||
        clean.includes(`spvr-${namePart}`) ||
        (clean.includes(namePart) && (clean.includes('awang') || clean.includes('dos'))) ||
        clean === namePart ||
        (namePart === 'jonny' && (clean === 'johnny' || clean.includes('spvr-johnny')));
    });
  });
}

// ─── MANDAUE SUB OFFICE ──────────────────────────────────────────────────────
export const MANDAUE_ALLOWED_SUPERVISORS = [
  "spvr-arlfred",
  "spvr-raffy",
  "spvr-roel",
  "spvr-michael",
  "spvr-joel",
  "spvr-eya",
  "spvr-carl",
  "spvr-jed",
  "spvr-nyor",
  "spvr-jason",
  "spvr-molly",
  "spvr-apple",
  "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"
];

/**
 * Checks if a supervisor belongs to MANDAUE.
 * @param {string|Object} itemOrKey
 * @returns {boolean}
 */
export function isMandaueOfficeAllowedSupervisor(itemOrKey) {
  if (!itemOrKey) return false;

  const candidates = typeof itemOrKey === 'object'
    ? [
      itemOrKey.supervisor,
      itemOrKey.username,
      itemOrKey.user,
      itemOrKey.supervisor_name,
      itemOrKey.supervisorName,
      itemOrKey.spvr
    ].filter(Boolean).map(s => String(s).toLowerCase().trim())
    : [String(itemOrKey).toLowerCase().trim()];

  return candidates.some(clean => {
    // Collision protection against Iligan/Lala supervisors sharing first names (e.g. Jason Mabini/Amen, Joel Ordona, Roel Luab)
    if (clean.includes('mabini') || clean.includes('amen') || clean.includes('gaudiano') || clean.includes('ordona') || clean.includes('luab') || clean.includes('donato')) {
      return false;
    }

    return MANDAUE_ALLOWED_SUPERVISORS.some(allowed => {
      const a = allowed.toLowerCase();
      const prefix = a.split('@')[0];
      const namePart = prefix.replace(/^spvr-/, '');
      return clean === a ||
        clean === prefix ||
        clean.startsWith(prefix) ||
        clean.includes(prefix) ||
        clean.includes(`spvr-${namePart}`) ||
        clean === namePart;
    });
  });
}

/**
 * Checks if a supervisor belongs to ANY recognized sub-office whitelist.
 * Restricts all unrelated supervisors across the entire system.
 * @param {string|Object} itemOrKey
 * @returns {boolean}
 */
export function isAnyAllowedSupervisor(itemOrKey) {
  if (!itemOrKey) return false;
  return isLandasanOfficeAllowedSupervisor(itemOrKey) ||
    isParangOfficeAllowedSupervisor(itemOrKey) ||
    isNKabuntalanOfficeAllowedSupervisor(itemOrKey) ||
    isNorthUpiOfficeAllowedSupervisor(itemOrKey) ||
    isSouthUpiOfficeAllowedSupervisor(itemOrKey) ||
    isDosAwangOfficeAllowedSupervisor(itemOrKey) ||
    isBaloiOfficeAllowedSupervisor(itemOrKey) ||
    isLalaOfficeAllowedSupervisor(itemOrKey) ||
    isIliganSetAAllowedSupervisor(itemOrKey) ||
    isIliganAllowedSupervisor(itemOrKey) ||
    isMandaueOfficeAllowedSupervisor(itemOrKey);
}

/**
 * Checks if a supervisor is allowed for a specific sub-office.
 * If office is not specified or 'ALL', checks if allowed in ANY recognized whitelist.
 * Restricts all unrelated supervisors.
 * @param {string|Object} itemOrKey
 * @param {string} officeName
 * @returns {boolean}
 */
export function isAllowedSupervisorForOffice(itemOrKey, officeName = '') {
  if (!itemOrKey) return false;
  const off = String(officeName || '').toLowerCase().trim();

  if (off.includes('awang') || off.includes('dos')) {
    return isDosAwangOfficeAllowedSupervisor(itemOrKey);
  }
  if ((off.includes('south') && off.includes('upi')) || off.includes('southupi')) {
    return isSouthUpiOfficeAllowedSupervisor(itemOrKey);
  }
  if (off.includes('north') && off.includes('upi')) {
    return isNorthUpiOfficeAllowedSupervisor(itemOrKey);
  }
  if (off.includes('upi')) {
    return isNorthUpiOfficeAllowedSupervisor(itemOrKey);
  }
  if (off.includes('kabuntalan')) {
    return isNKabuntalanOfficeAllowedSupervisor(itemOrKey);
  }
  if (off.includes('landasan')) {
    return isLandasanOfficeAllowedSupervisor(itemOrKey);
  }
  if (off.includes('parang')) {
    return isParangOfficeAllowedSupervisor(itemOrKey);
  }
  if (off.includes('baloi')) {
    return isBaloiOfficeAllowedSupervisor(itemOrKey);
  }
  if (off.includes('lala')) {
    return isLalaOfficeAllowedSupervisor(itemOrKey);
  }
  if (off.includes('set a')) {
    return isIliganSetAAllowedSupervisor(itemOrKey);
  }
  if (off.includes('set b')) {
    return isIliganAllowedSupervisor(itemOrKey);
  }
  if (off.includes('iligan') || off.includes('ldn')) {
    return isIliganAllowedSupervisor(itemOrKey) || isIliganSetAAllowedSupervisor(itemOrKey);
  }
  if (off.includes('mandaue')) {
    return isMandaueOfficeAllowedSupervisor(itemOrKey);
  }

  // If sub-office is unknown, composite, or 'ALL', item must belong to AT LEAST ONE allowed office
  return isAnyAllowedSupervisor(itemOrKey);
}

// ─── Default name map (static fallback) ─────────────────────────────────────
export const DEFAULT_SUPERVISOR_NAMES = {
  // Standard Sub-Office Supervisors
  "spvr-arlfred": "ARLFRED SABERON",
  "spvr-raffy": "RAFFY BAGUIO",
  "spvr-roel": "ROEL CATALAN",
  "spvr-michael": "MICHAEL DE GUZMAN",
  "spvr-joel": "JOEL ESTORCO",
  "spvr-eya": "HARRY EYA",
  "spvr-carl": "CARL MANGRUBAN",
  "spvr-jed": "JED MELENDREZ",
  "spvr-nyor": "NYOR SESALDO",
  "spvr-jason": "NARCISO TAGUD JR.",
  "spvr-molly": "MOLLY BATUBALANOS",
  "spvr-apple": "COORDINATOR - APPLEGROUP",
  "21": "RAFFY BAGUIO",
  "22": "ARLFRED SABERON",
  "23": "ROEL CATALAN",
  "24": "MICHAEL DE GUZMAN",
  "25": "JOEL ESTORCO",
  "26": "HARRY EYA",
  "27": "CARL MANGRUBAN",
  "28": "JED MELENDREZ",
  "29": "NYOR SESALDO",
  "30": "NARCISO TAGUD JR.",
  "31": "MOLLY BATUBALANOS",

  // Iligan Numeric IDs
  "32": "EDGARDO CAINGLES JR.",
  "35": "FREXYNIES BACALSO",
  "36": "HECTOR CANDOLE",
  "40": "JOEL ORDONA",
  "41": "JUNRIE MORALES",
  "45": "EDMOND GONZAGA",
  "46": "STEVE RODRIGUEZ",
  "58": "NAVE XYRIL HOTILLA",

  // Iligan Set A Supervisors (Official from API id=5 and id=8)
  "steverodriguez@gfldn": "STEVE RODRIGUEZ",
  "steverodriguez": "STEVE RODRIGUEZ",
  "joelordona@gfldn": "JOEL ORDONA",
  "joelordona": "JOEL ORDONA",
  "hectorcandole@gfldn": "HECTOR CANDOLE",
  "hectorcandole": "HECTOR CANDOLE",
  "navexyrilhotilla@gfldn": "NAVE XYRIL HOTILLA",
  "navexyrilhotilla": "NAVE XYRIL HOTILLA",
  "frexyniesbacalso@gfldn": "FREXYNIES BACALSO",
  "frexyniesbacalso": "FREXYNIES BACALSO",
  "junriemorales@gfldn": "JUNRIE MORALES",
  "junriemorales": "JUNRIE MORALES",
  "cristianagaton@gfldn": "CRISTIAN AGATON",
  "cristianagaton": "CRISTIAN AGATON",
  "camilojayminoza@gfldn": "CAMILO JAY MINOZA",
  "camilojayminoza": "CAMILO JAY MINOZA",
  "edmondgonzaga@gfldn": "EDMOND GONZAGA",
  "edmondgonzaga": "EDMOND GONZAGA",
  "clintdarylbalansag@gfldn": "CLINT DARYL BALANSAG",
  "edgardocainglesjr@gfldn": "EDGARDO CAINGLES JR.",
  "jasonamen@gfldn": "JASON AMEN",
  "erluarboladura@gfldn": "ERLU ARBOLADURA",
  "isaganipaculba@gfldn": "ISAGANI S. PACULBA",
  "jesustitodonato@gfldn": "JESUS TITO DONATO",
  "jetmichaeldonato@gfldn": "JET MICHAEL DONATO",
  "patrickchiong@gfldn": "PATRICK CHIONG",
  "johnstephgorres@gfldn": "JOHN STEPH GORRES",
  "arnoldabitona@gfldn": "ARNOLD ABITONA",
  "regiemorales@gfldn": "REGIE MORALES",
  "marlontautoan@gfldn": "MARLON TAUTOAN",
  "annesumile@gfldn": "ANNE SUMILE",
  "mubaraktomanor@gfldn": "MUBARAK RAMPAT TOMANOR",
  "amirodingmaba@gfldn": "AMIRODING MABA",

  // Iligan Set B Supervisors (Official from API id=7)
  "jasonmabini@gfldn": "JASON F. MABINI",
  "jasonmabini": "JASON F. MABINI",
  "jessentpizon@gfldn": "JESSENT M. PIZON",
  "jessentpizon": "JESSENT M. PIZON",
  "jacksonslimpangog@gfldn": "JACKSON S. LIMPANGOG",
  "jacksonslimpangog": "JACKSON S. LIMPANGOG",
  "rielmpizon@gfldn": "RIEL M. PIZON",
  "rielmpizon": "RIEL M. PIZON",
  "ianjohnmbalala@gfldn": "IAN JOHN M. BALALA",
  "ianjohnmbalala": "IAN JOHN M. BALALA",
  "ivankennethg.agcopra@gfldn": "IVAN KENNETH G. AGCOPRA",
  "ivankennethg.agcopra": "IVAN KENNETH G. AGCOPRA",
  "coor@gfldn": "AGENTS UNDER COORDINATOR",
  "coor": "AGENTS UNDER COORDINATOR",

  // LALA Office Supervisors (Official from API id=2)
  "archiefernandez@gfldn": "ARCHIE FERNANDEZ",
  "archiefernandez": "ARCHIE FERNANDEZ",
  "melvinlimbaga@gflfn": "MELVIN LIMBAGA",
  "melvinlimbaga@gfldn": "MELVIN LIMBAGA",
  "melvinlimbaga": "MELVIN LIMBAGA",
  "noelordonez@gfldn": "NOEL ORDONEZ",
  "noelordonez": "NOEL ORDONEZ",
  "jasongaudiano@gfldn": "JASON GAUDIANO",
  "jasongaudiano": "JASON GAUDIANO",
  "jetpepito@gfldn": "JET PEPITO",
  "jetpepito": "JET PEPITO",
  "roelluab@gfldn": "ROEL LUAB",
  "roelluab": "ROEL LUAB",
  "alindaalingan@gfldn": "ALINDA ALINGAN",
  "alindaalingan": "ALINDA ALINGAN",
  "odencampong@gfldn": "ODEN CAMPONG",
  "odencampong": "ODEN CAMPONG",
  "alancaralos@gfldn": "ALAN CARALOS",
  "alancaralos": "ALAN CARALOS",
  "jovanfernandez@gfldn": "JOVAN FERNANDEZ",
  "jovanfernandez": "JOVAN FERNANDEZ",
  "marjohndelacerna@gfldn": "MARJOHN DELA CERNA",
  "marjohndelacerna": "MARJOHN DELA CERNA",
  "rutherdelacerna@gfldn": "RUTHER DELA CERNA",
  "rutherdelacerna": "RUTHER DELA CERNA",
  "andyvicabias@gfldn": "ANDY VIC ABIAS",
  "andyvicabias": "ANDY VIC ABIAS",
  "jeffreybaguio@gfldn": "JEFFREY BAGUIO",
  "jeffreybaguio": "JEFFREY BAGUIO",
  "daveasidor@gfldn": "DAVE ASIDOR",
  "daveasidor": "DAVE ASIDOR",
  "nadermasauna@gfldn": "NADER MASAUNA",
  "nadermasauna": "NADER MASAUNA",
  "faisalmacabato@gfldn": "FAISAL MACABATO",
  "faisalmacabato": "FAISAL MACABATO",
  "froilanbuhisan@gfldn": "FROILAN BUHISAN",
  "froilanbuhisan": "FROILAN BUHISAN",
  "jamesmarlonlucot@gfldn": "JAMES MARLON LUCOT",
  "jamesmarlonlucot": "JAMES MARLON LUCOT",
  "jovenillodayle@gfldn": "JOVENILLO DAYLE",
  "jovenillodayle": "JOVENILLO DAYLE",
  "dextheralandroque@gfldn": "DEXTHER ALANDROQUE",
  "dextheralandroque": "DEXTHER ALANDROQUE",
  "labador@gfldn": "CRESELYE B. LABADOR",
  "labador": "CRESELYE B. LABADOR",
  "honeyclearlumantas@gfldn": "HONEY CLEAR LUMANTAS",
  "honeyclearlumantas": "HONEY CLEAR LUMANTAS",
  "kissiemontero@gfldn": "KISSIE MONTERO",
  "kissiemontero": "KISSIE MONTERO",

  // BALOI Office Supervisors (Official from API id=6)
  "jaysalac@gfldn": "JAY SALAC",
  "jaysalac": "JAY SALAC",
  "mapantasmala@gfldn": "MAPANTAS MALA",
  "mapantasmala": "MAPANTAS MALA",
  "alisamagondacan@gfldn": "ALISA MAGONDACAN",
  "alisamagondacan": "ALISA MAGONDACAN",
  "acmadpalo@gfldn": "ACMAD PALO",
  "acmadpalo": "ACMAD PALO",
  "fatimamarieobillos@gfldn": "IVAN KENNETH G. AGCOPRA",
  "fatimamarieobillos": "IVAN KENNETH G. AGCOPRA",
  "ivankennethagcopra@gfldn": "IVAN KENNETH G. AGCOPRA",
  "ivankennethagcopra": "IVAN KENNETH G. AGCOPRA",
  "agentsundercoor@gfldn": "AGENTS UNDER COORDINATOR",
  "agentsundercoor": "AGENTS UNDER COORDINATOR",
  "ianjohnbalala@gfldn": "IAN JOHN M. BALALA",
  "ianjohnbalala": "IAN JOHN M. BALALA",
  "rielpizon@gfldn": "RIEL M. PIZON",
  "rielpizon": "RIEL M. PIZON",
  "jacksonlimpangog@gfldn": "JACKSON S. LIMPANGOG",
  "jacksonlimpangog": "JACKSON S. LIMPANGOG",

  // LANDASAN Office Supervisors
  "parang-spvr-nelson": "PARANG-SPVR-NELSON",
  "parang-spvr-nelson@gfldn": "PARANG-SPVR-NELSON",
  "spvr-nelson": "PARANG-SPVR-NELSON",
  "nelson": "PARANG-SPVR-NELSON",

  // PARANG Sub-Office Supervisors
  "parang-spvr-rodelito": "PARANG-SPVR-RODELITO",
  "parang-spvr-rodelito@gfldn": "PARANG-SPVR-RODELITO",
  "spvr-rodelito": "PARANG-SPVR-RODELITO",
  "rodelito": "PARANG-SPVR-RODELITO",

  "parang-spvr-reymark": "PARANG-SPVR-REYMARK",
  "parang-spvr-reymark@gfldn": "PARANG-SPVR-REYMARK",
  "spvr-reymark": "PARANG-SPVR-REYMARK",
  "reymark": "PARANG-SPVR-REYMARK",

  "parang-spvr-jonathan": "PARANG-SPVR-JONATHAN",
  "parang-spvr-jonathan@gfldn": "PARANG-SPVR-JONATHAN",
  "spvr-jonathan": "PARANG-SPVR-JONATHAN",
  "jonathan": "PARANG-SPVR-JONATHAN",

  // N-KABUNTALAN Sub-Office Supervisors
  "nkabuntalan-spvr-rowel": "NKABUNTALAN-SPVR-ROWEL",
  "nkabuntalan-spvr-rowel@gfldn": "NKABUNTALAN-SPVR-ROWEL",
  "n-kabuntalan-spvr-rowel": "NKABUNTALAN-SPVR-ROWEL",
  "n-kabuntalan-spvr-rowel@gfldn": "NKABUNTALAN-SPVR-ROWEL",
  "spvr-rowel": "NKABUNTALAN-SPVR-ROWEL",
  "rowel": "NKABUNTALAN-SPVR-ROWEL",

  // NORTH UPI Sub-Office Supervisors
  "upi-spvr-joevert": "UPI-SPVR-JOEVERT",
  "upi-spvr-joevert@gfldn": "UPI-SPVR-JOEVERT",
  "spvr-joevert": "UPI-SPVR-JOEVERT",
  "joevert": "UPI-SPVR-JOEVERT",

  "upi-spvr-livelo": "UPI-SPVR-LIVELO",
  "upi-spvr-livelo@gfldn": "UPI-SPVR-LIVELO",
  "spvr-livelo": "UPI-SPVR-LIVELO",
  "livelo": "UPI-SPVR-LIVELO",

  "upi-spvr-armando": "UPI-SPVR-ARMANDO",
  "upi-spvr-armando@gfldn": "UPI-SPVR-ARMANDO",
  "spvr-armando": "UPI-SPVR-ARMANDO",
  "armando": "UPI-SPVR-ARMANDO",

  "upi-spvr-wilboren": "UPI-SPVR-WILBOREN",
  "upi-spvr-wilboren@gfldn": "UPI-SPVR-WILBOREN",
  "spvr-wilboren": "UPI-SPVR-WILBOREN",
  "wilboren": "UPI-SPVR-WILBOREN",

  "upi-spvr-pasawiran": "UPI-SPVR-PASAWIRAN",
  "upi-spvr-pasawiran@gfldn": "UPI-SPVR-PASAWIRAN",
  "spvr-pasawiran": "UPI-SPVR-PASAWIRAN",
  "pasawiran": "UPI-SPVR-PASAWIRAN",

  "dbs-spvr-kinimi-ago": "DBS-SPVR-KINIMI-AGO",
  "dbs-spvr-kinimi-ago@gfldn": "DBS-SPVR-KINIMI-AGO",
  "spvr-kinimi-ago": "DBS-SPVR-KINIMI-AGO",
  "kinimi-ago": "DBS-SPVR-KINIMI-AGO",

  "dbs-spvr-ago": "DBS-SPVR-AGO",
  "dbs-spvr-ago@gfldn": "DBS-SPVR-AGO",
  "spvr-ago": "DBS-SPVR-AGO",
  "ago": "DBS-SPVR-AGO",

  "upi-spvr-mosher/bai": "UPI-SPVR-MOSHER/BAI",
  "upi-spvr-mosher/bai@gfldn": "UPI-SPVR-MOSHER/BAI",
  "upi-spvr-mosher-bai": "UPI-SPVR-MOSHER/BAI",
  "upi-spvr-mosher-bai@gfldn": "UPI-SPVR-MOSHER/BAI",
  "upi-spvr-mosher": "UPI-SPVR-MOSHER/BAI",
  "spvr-mosher": "UPI-SPVR-MOSHER/BAI",
  "mosher/bai": "UPI-SPVR-MOSHER/BAI",
  "mosher-bai": "UPI-SPVR-MOSHER/BAI",
  "mosher": "UPI-SPVR-MOSHER/BAI",

  "upi-spvr-ken": "UPI-SPVR-KEN",
  "upi-spvr-ken@gfldn": "UPI-SPVR-KEN",
  "spvr-ken": "UPI-SPVR-KEN",
  "ken": "UPI-SPVR-KEN",

  "upi-spvr-galinato": "UPI-SPVR-GALINATO",
  "upi-spvr-galinato@gfldn": "UPI-SPVR-GALINATO",
  "spvr-galinato": "UPI-SPVR-GALINATO",
  "galinato": "UPI-SPVR-GALINATO",

  "upi-spvr-cedric": "UPI-SPVR-CEDRIC",
  "upi-spvr-cedric@gfldn": "UPI-SPVR-CEDRIC",
  "spvr-cedric": "UPI-SPVR-CEDRIC",
  "cedric": "UPI-SPVR-CEDRIC",

  // SOUTH UPI Sub-Office Supervisors
  "upi-spvr-guiamad": "UPI-SPVR-GUIAMAD",
  "upi-spvr-guiamad@gfldn": "UPI-SPVR-GUIAMAD",
  "southupi-spvr-guiamad": "UPI-SPVR-GUIAMAD",
  "spvr-guiamad": "UPI-SPVR-GUIAMAD",
  "guiamad": "UPI-SPVR-GUIAMAD",

  "southupi-spvr-asrap": "SOUTHUPI-SPVR-ASRAP",
  "southupi-spvr-asrap@gfldn": "SOUTHUPI-SPVR-ASRAP",
  "upi-spvr-asrap": "SOUTHUPI-SPVR-ASRAP",
  "spvr-asrap": "SOUTHUPI-SPVR-ASRAP",
  "asrap": "SOUTHUPI-SPVR-ASRAP",

  "spvr-valdez-southupi": "SPVR-VALDEZ-SOUTHUPI",
  "spvr-valdez-southupi@gfldn": "SPVR-VALDEZ-SOUTHUPI",
  "southupi-spvr-valdez": "SPVR-VALDEZ-SOUTHUPI",
  "valdez-southupi": "SPVR-VALDEZ-SOUTHUPI",
  "spvr-valdez": "SPVR-VALDEZ-SOUTHUPI",
  "valdez": "SPVR-VALDEZ-SOUTHUPI",

  "southupi-spvr-lu": "SOUTHUPI-SPVR-LU",
  "southupi-spvr-lu@gfldn": "SOUTHUPI-SPVR-LU",
  "upi-spvr-lu": "SOUTHUPI-SPVR-LU",
  "spvr-lu": "SOUTHUPI-SPVR-LU",
  "lu": "SOUTHUPI-SPVR-LU",

  "southupi-spvr-roland": "SOUTHUPI-SPVR-ROLAND",
  "southupi-spvr-roland@gfldn": "SOUTHUPI-SPVR-ROLAND",
  "upi-spvr-roland": "SOUTHUPI-SPVR-ROLAND",
  "spvr-roland": "SOUTHUPI-SPVR-ROLAND",
  "roland": "SOUTHUPI-SPVR-ROLAND",

  "southupi-spvr-mark": "SOUTHUPI-SPVR-MARK",
  "southupi-spvr-mark@gfldn": "SOUTHUPI-SPVR-MARK",
  "upi-spvr-mark": "SOUTHUPI-SPVR-MARK",
  "spvr-mark": "SOUTHUPI-SPVR-MARK",
  "mark": "SOUTHUPI-SPVR-MARK",

  "southupi-spvr-rommel": "SOUTHUPI-SPVR-ROMMEL",
  "southupi-spvr-rommel@gfldn": "SOUTHUPI-SPVR-ROMMEL",
  "upi-spvr-rommel": "SOUTHUPI-SPVR-ROMMEL",
  "spvr-rommel": "SOUTHUPI-SPVR-ROMMEL",
  "rommel": "SOUTHUPI-SPVR-ROMMEL",

  // DOS/AWANG SUB-OFFICE SUPERVISORS
  "dos/awang-spvr-ramsie": "DOS/AWANG-SPVR-RAMSIE",
  "dos-awang-spvr-ramsie": "DOS/AWANG-SPVR-RAMSIE",
  "dos/awang-spvr-ramsie@gfldn": "DOS/AWANG-SPVR-RAMSIE",
  "dos-awang-spvr-ramsie@gfldn": "DOS/AWANG-SPVR-RAMSIE",
  "spvr-ramsie": "DOS/AWANG-SPVR-RAMSIE",
  "ramsie": "DOS/AWANG-SPVR-RAMSIE",

  "dos/awang-spvr-lorenzo": "DOS/AWANG-SPVR-LORENZO",
  "dos-awang-spvr-lorenzo": "DOS/AWANG-SPVR-LORENZO",
  "dos/awang-spvr-lorenzo@gfldn": "DOS/AWANG-SPVR-LORENZO",
  "dos-awang-spvr-lorenzo@gfldn": "DOS/AWANG-SPVR-LORENZO",
  "spvr-lorenzo": "DOS/AWANG-SPVR-LORENZO",
  "lorenzo": "DOS/AWANG-SPVR-LORENZO",

  "dos/awang-spvr-jonny": "DOS/AWANG-SPVR-JONNY",
  "dos-awang-spvr-jonny": "DOS/AWANG-SPVR-JONNY",
  "dos/awang-spvr-jonny@gfldn": "DOS/AWANG-SPVR-JONNY",
  "dos-awang-spvr-jonny@gfldn": "DOS/AWANG-SPVR-JONNY",
  "dos/awang-spvr-johnny": "DOS/AWANG-SPVR-JONNY",
  "dos-awang-spvr-johnny": "DOS/AWANG-SPVR-JONNY",
  "spvr-jonny": "DOS/AWANG-SPVR-JONNY",
  "spvr-johnny": "DOS/AWANG-SPVR-JONNY",
  "jonny": "DOS/AWANG-SPVR-JONNY",
  "johnny": "DOS/AWANG-SPVR-JONNY",

  "dos/awang-spvr-marlon": "DOS/AWANG-SPVR-MARLON",
  "dos-awang-spvr-marlon": "DOS/AWANG-SPVR-MARLON",
  "dos/awang-spvr-marlon@gfldn": "DOS/AWANG-SPVR-MARLON",
  "dos-awang-spvr-marlon@gfldn": "DOS/AWANG-SPVR-MARLON",
  "spvr-marlon": "DOS/AWANG-SPVR-MARLON",

  "dos/awang-spvr-harif": "DOS/AWANG-SPVR-HARIF",
  "dos-awang-spvr-harif": "DOS/AWANG-SPVR-HARIF",
  "dos/awang-spvr-harif@gfldn": "DOS/AWANG-SPVR-HARIF",
  "dos-awang-spvr-harif@gfldn": "DOS/AWANG-SPVR-HARIF",
  "spvr-harif": "DOS/AWANG-SPVR-HARIF",
  "harif": "DOS/AWANG-SPVR-HARIF"
};
/**
 * Checks if a supervisor username/key belongs to the allowed ILIGAN SET B supervisors
 * @param {string} key
 * @returns {boolean}
 */
export function isIliganAllowedSupervisor(itemOrKey) {
  if (!itemOrKey) return false;
  const candidates = typeof itemOrKey === 'object'
    ? [
      itemOrKey.supervisor,
      itemOrKey.username,
      itemOrKey.user,
      itemOrKey.supervisor_name,
      itemOrKey.supervisorName,
      itemOrKey.spvr
    ].filter(Boolean).map(s => String(s).toLowerCase().trim())
    : [String(itemOrKey).toLowerCase().trim()];

  return candidates.some(clean => {
    return ILIGAN_ALLOWED_SUPERVISORS.some(allowed => {
      const a = allowed.toLowerCase();
      const prefix = a.split('@')[0];
      return clean === a || clean === prefix || clean.startsWith(prefix) || a.includes(clean);
    });
  });
}

/**
 * Checks if a supervisor belongs to ILIGAN SET A.
 * If ILIGAN_SET_A_ALLOWED_SUPERVISORS is empty, all supervisors from the API are accepted.
 * @param {string|Object} itemOrKey
 * @returns {boolean}
 */
export function isIliganSetAAllowedSupervisor(itemOrKey) {
  if (!itemOrKey) return false;
  if (ILIGAN_SET_A_ALLOWED_SUPERVISORS.length === 0) return true;
  const candidates = typeof itemOrKey === 'object'
    ? [
      itemOrKey.supervisor,
      itemOrKey.username,
      itemOrKey.user,
      itemOrKey.supervisor_name,
      itemOrKey.supervisorName,
      itemOrKey.spvr
    ].filter(Boolean).map(s => String(s).toLowerCase().trim())
    : [String(itemOrKey).toLowerCase().trim()];

  return candidates.some(clean => {
    return ILIGAN_SET_A_ALLOWED_SUPERVISORS.some(allowed => {
      const a = allowed.toLowerCase();
      const prefix = a.split('@')[0];
      return clean === a || clean === prefix || clean.startsWith(prefix) || a.includes(clean);
    });
  });
}

/**
 * Checks if a supervisor belongs to LALA OFFICE.
 * @param {string|Object} itemOrKey
 * @returns {boolean}
 */
export function isLalaOfficeAllowedSupervisor(itemOrKey) {
  if (!itemOrKey) return false;
  if (LALA_OFFICE_ALLOWED_SUPERVISORS.length === 0) return true;
  const candidates = typeof itemOrKey === 'object'
    ? [
      itemOrKey.supervisor,
      itemOrKey.username,
      itemOrKey.user,
      itemOrKey.supervisor_name,
      itemOrKey.supervisorName,
      itemOrKey.spvr
    ].filter(Boolean).map(s => String(s).toLowerCase().trim())
    : [String(itemOrKey).toLowerCase().trim()];

  return candidates.some(clean => {
    return LALA_OFFICE_ALLOWED_SUPERVISORS.some(allowed => {
      const a = allowed.toLowerCase();
      const prefix = a.split('@')[0];
      return clean === a || clean === prefix || clean.startsWith(prefix) || a.includes(clean);
    });
  });
}

/**
 * Checks if a supervisor belongs to BALOI OFFICE.
 * @param {string|Object} itemOrKey
 * @returns {boolean}
 */
export function isBaloiOfficeAllowedSupervisor(itemOrKey) {
  if (!itemOrKey) return false;
  if (BALOI_OFFICE_ALLOWED_SUPERVISORS.length === 0) return true;
  const candidates = typeof itemOrKey === 'object'
    ? [
      itemOrKey.supervisor,
      itemOrKey.username,
      itemOrKey.user,
      itemOrKey.supervisor_name,
      itemOrKey.supervisorName,
      itemOrKey.spvr
    ].filter(Boolean).map(s => String(s).toLowerCase().trim())
    : [String(itemOrKey).toLowerCase().trim()];

  return candidates.some(clean => {
    return BALOI_OFFICE_ALLOWED_SUPERVISORS.some(allowed => {
      const a = allowed.toLowerCase();
      const prefix = a.split('@')[0];
      return clean === a || clean === prefix || clean.startsWith(prefix) || a.includes(clean);
    });
  });
}

// In-memory cache keyed by sub-office label
const supervisorCache = new Map();
const inFlightPromises = new Map();

/**
 * Clear supervisor cache when gateway endpoints or settings change.
 */
export function clearSupervisorCache() {
  supervisorCache.clear();
  supervisorUrlCache.clear();
}

/**
 * Resolve the Bearer auth header from gateway endpoints.
 * Only returns a token if an endpoint is explicitly configured for Iligan / LDN.
 * Does NOT fall back to other office tokens (e.g. Mandaue) to avoid 401 Unauthorized errors.
 */
function getIliganAuthHeader(gatewayEndpoints = []) {
  const eps = (gatewayEndpoints || []).filter(e => e && e.is_active !== false);

  // Look strictly for an endpoint configured for Iligan / LDN
  const ep = eps.find(e => {
    const sub = (e.sub_office || e.name || '').toLowerCase();
    const url = (e.baseUrl || '').toLowerCase();
    return sub.includes('iligan') || url.includes('stl-ldn-api') || sub.includes('ldn');
  });

  if (!ep || !ep.token) {
    return '';
  }

  const rawToken = ep.token.trim();
  return rawToken
    ? (rawToken.toLowerCase().startsWith('bearer ') ? rawToken : `Bearer ${rawToken}`)
    : '';
}

// 10-Minute in-memory cache for supervisor endpoints
const supervisorUrlCache = new Map();
const SUPERVISOR_CACHE_TTL = 10 * 60 * 1000;

/**
 * Helper to fetch and parse supervisor data from a list of candidate URLs
 * @param {Array<string>} urls
 * @param {string} authHeader
 * @param {Function|null} allowFn - (username: string) => boolean, or null to accept all
 * @returns {Promise<Object>}
 */
async function fetchSupervisorsFromUrls(urls, authHeader, allowFn = null) {
  // If requesting LDN supervisors without an active LDN token, skip to avoid 401 Unauthorized
  if (!authHeader && urls.some(u => u.includes('stl-ldn-api.com'))) {
    return {};
  }

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json'
  };
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const merged = {};
  const now = Date.now();

  await Promise.all(
    urls.map(async (url) => {
      try {
        const cached = supervisorUrlCache.get(url);
        if (cached && (now - cached.timestamp) < SUPERVISOR_CACHE_TTL) {
          const rawList = cached.data || [];
          rawList.forEach(item => {
            if (!item) return;
            const name = (
              item.name || item.fullName || item.full_name ||
              item.supervisor_name || item.username || ''
            ).trim().toUpperCase();
            const username = (item.username || item.email || '').trim().toLowerCase();
            if (allowFn) {
              const allowed = allowFn(item) || (username ? allowFn(username) : false) || (name ? allowFn(name) : false);
              if (!allowed) return;
            }
            if (name) {
              if (item.id !== undefined && item.id !== null) merged[String(item.id).toLowerCase()] = name;
              if (username) {
                merged[username] = name;
                merged[username.split('@')[0]] = name;
              }
              if (item.code) merged[String(item.code).toLowerCase()] = name;
            }
          });
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await proxyFetch(url, { method: 'GET', headers, signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          // Cache empty result on 401/403/errors to prevent repeated API flooding
          supervisorUrlCache.set(url, { timestamp: now, data: [] });
          return;
        }

        const json = await res.json();
        const rawList = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json?.supervisors)
              ? json.supervisors
              : json?.data && typeof json.data === 'object'
                ? [json.data]
                : [];

        supervisorUrlCache.set(url, { timestamp: now, data: rawList });

        rawList.forEach(item => {
          if (!item) return;
          const name = (
            item.name || item.fullName || item.full_name ||
            item.supervisor_name || item.username || ''
          ).trim().toUpperCase();

          const username = (item.username || item.email || '').trim().toLowerCase();

          if (allowFn) {
            const allowed = allowFn(item) || (username ? allowFn(username) : false) || (name ? allowFn(name) : false);
            if (!allowed) return;
          }

          if (name) {
            if (item.id !== undefined && item.id !== null) {
              merged[String(item.id).toLowerCase()] = name;
            }
            if (username) {
              merged[username] = name;
              merged[username.split('@')[0]] = name;
            }
            if (item.code) {
              merged[String(item.code).toLowerCase()] = name;
            }
          }
        });
      } catch {
        // Cache error state with timestamp so failed URLs are not constantly hammered
        supervisorUrlCache.set(url, { timestamp: now, data: [] });
      }
    })
  );

  return merged;
}

// ─── ILIGAN SET B (id=7) ─────────────────────────────────────────────────────

/**
 * Fetch supervisors for ILIGAN SET B (supervisor?id=7)
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchIliganSupervisors(gatewayEndpoints = []) {
  const cacheKey = 'ILIGAN_SET_B';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const authHeader = getIliganAuthHeader(gatewayEndpoints);
  if (!authHeader) return {};

  const result = await fetchSupervisorsFromUrls(
    ['https://stl-ldn-api.com/api/accountant/supervisor?id=7'],
    authHeader,
    isIliganAllowedSupervisor
  );

  supervisorCache.set(cacheKey, result);
  return result;
}

// ─── ILIGAN SET A (id=5 + id=8) ──────────────────────────────────────────────

/**
 * Fetch supervisors for ILIGAN SET A (supervisor?id=5 and supervisor?id=8).
 * Results from both endpoints are merged into a single map.
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchIliganSetASupervisors(gatewayEndpoints = []) {
  const cacheKey = 'ILIGAN_SET_A';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const authHeader = getIliganAuthHeader(gatewayEndpoints);
  if (!authHeader) return {};

  const result = await fetchSupervisorsFromUrls(
    [
      'https://stl-ldn-api.com/api/accountant/supervisor?id=5',
      'https://stl-ldn-api.com/api/accountant/supervisor?id=8'
    ],
    authHeader,
    ILIGAN_SET_A_ALLOWED_SUPERVISORS.length > 0 ? isIliganSetAAllowedSupervisor : null
  );

  supervisorCache.set(cacheKey, result);
  return result;
}

// ─── LALA OFFICE (id=2) ──────────────────────────────────────────────────────

/**
 * Fetch supervisors for LALA OFFICE (supervisor?id=2).
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchLalaOfficeSupervisors(gatewayEndpoints = []) {
  const cacheKey = 'LALA_OFFICE';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const authHeader = getIliganAuthHeader(gatewayEndpoints);
  if (!authHeader) return {};

  const result = await fetchSupervisorsFromUrls(
    ['https://stl-ldn-api.com/api/accountant/supervisor?id=2'],
    authHeader,
    LALA_OFFICE_ALLOWED_SUPERVISORS.length > 0 ? isLalaOfficeAllowedSupervisor : null
  );

  supervisorCache.set(cacheKey, result);
  return result;
}

// ─── BALOI OFFICE (id=6) ─────────────────────────────────────────────────────

/**
 * Fetch supervisors for BALOI OFFICE (supervisor?id=6).
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchBaloiOfficeSupervisors(gatewayEndpoints = []) {
  const cacheKey = 'BALOI_OFFICE';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const authHeader = getIliganAuthHeader(gatewayEndpoints);
  if (!authHeader) return {};

  const result = await fetchSupervisorsFromUrls(
    ['https://stl-ldn-api.com/api/accountant/supervisor?id=6'],
    authHeader,
    BALOI_OFFICE_ALLOWED_SUPERVISORS.length > 0 ? isBaloiOfficeAllowedSupervisor : null
  );

  supervisorCache.set(cacheKey, result);
  return result;
}

// ─── MANDAUE (id=7) ─────────────────────────────────────────────────────────

/**
 * Fetch supervisors for Mandaue Central (supervisor?id=7)
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchMandaueSupervisors(gatewayEndpoints = []) {
  const cacheKey = 'MANDAUE_SUPERVISORS';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const eps = (gatewayEndpoints || []).filter(e => e && e.is_active !== false);
  const mandaueEp = eps.find(e => {
    const sub = (e.sub_office || e.name || '').toLowerCase();
    const url = (e.baseUrl || '').toLowerCase();
    return sub.includes('mandaue') || url.includes('stl-mandaue') || sub === 'all';
  });
  const authHeader = mandaueEp?.token ? (mandaueEp.token.startsWith('Bearer ') ? mandaueEp.token : `Bearer ${mandaueEp.token}`) : '';

  const result = await fetchSupervisorsFromUrls(
    [
      'https://stl-mandaue-api.com/api/accountant/supervisor?id=2',
      'https://stl-mandaue-api.com/api/accountant/supervisor?id=7'
    ],
    authHeader,
    isMandaueOfficeAllowedSupervisor
  );

  supervisorCache.set(cacheKey, result);
  return result;
}

// ─── LANDASAN OFFICE SUPERVISORS ─────────────────────────────────────────────

/**
 * Fetch supervisors for LANDASAN OFFICE.
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchLandasanOfficeSupervisors(gatewayEndpoints = []) {
  const cacheKey = 'LANDASAN_OFFICE';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const eps = (gatewayEndpoints || []).filter(e => e && e.is_active !== false);
  const landasanEp = eps.find(e => {
    const sub = (e.sub_office || e.name || '').toLowerCase();
    const url = (e.baseUrl || '').toLowerCase();
    return sub.includes('landasan') || url.includes('landasan');
  });

  let dynamicMap = {};
  if (landasanEp && landasanEp.baseUrl && landasanEp.token) {
    const authHeader = landasanEp.token.startsWith('Bearer ') ? landasanEp.token : `Bearer ${landasanEp.token}`;
    const baseUrl = landasanEp.baseUrl.replace(/\/+$/, '');
    dynamicMap = await fetchSupervisorsFromUrls(
      [
        `${baseUrl}/api/accountant/supervisor`,
        `${baseUrl}/api/accountant/supervisor?id=1`,
        `${baseUrl}/api/accountant/supervisor?id=2`,
        `${baseUrl}/api/accountant/supervisor?id=3`,
        `${baseUrl}/api/accountant/supervisor?id=4`,
        `${baseUrl}/api/accountant/supervisor?id=5`,
        `${baseUrl}/api/accountant/supervisor?id=6`,
        `${baseUrl}/api/accountant/supervisor?id=7`,
        `${baseUrl}/api/accountant/supervisor?id=8`
      ],
      authHeader,
      isLandasanOfficeAllowedSupervisor
    );
  }

  const staticLandasanMap = {
    "parang-spvr-nelson": "PARANG-SPVR-NELSON",
    "parang-spvr-nelson@gfldn": "PARANG-SPVR-NELSON",
    "spvr-nelson": "PARANG-SPVR-NELSON",
    "nelson": "PARANG-SPVR-NELSON"
  };

  const result = { ...staticLandasanMap, ...dynamicMap };
  supervisorCache.set(cacheKey, result);
  return result;
}

// ─── PARANG SUB OFFICE SUPERVISORS ───────────────────────────────────────────

/**
 * Fetch supervisors for PARANG SUB OFFICE.
 * Strictly fetches/allows only: PARANG-SPVR-RODELITO, PARANG-SPVR-REYMARK, PARANG-SPVR-JONATHAN.
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchParangOfficeSupervisors(gatewayEndpoints = []) {
  const cacheKey = 'PARANG_OFFICE';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const eps = (gatewayEndpoints || []).filter(e => e && e.is_active !== false);
  const parangEp = eps.find(e => {
    const sub = (e.sub_office || e.name || '').toLowerCase();
    const url = (e.baseUrl || '').toLowerCase();
    return sub.includes('parang') || url.includes('parang');
  });

  let dynamicMap = {};
  if (parangEp && parangEp.baseUrl && parangEp.token) {
    const authHeader = parangEp.token.startsWith('Bearer ') ? parangEp.token : `Bearer ${parangEp.token}`;
    const baseUrl = parangEp.baseUrl.replace(/\/+$/, '');
    dynamicMap = await fetchSupervisorsFromUrls(
      [
        `${baseUrl}/api/accountant/supervisor`,
        `${baseUrl}/api/accountant/supervisor?id=1`,
        `${baseUrl}/api/accountant/supervisor?id=2`,
        `${baseUrl}/api/accountant/supervisor?id=3`,
        `${baseUrl}/api/accountant/supervisor?id=4`,
        `${baseUrl}/api/accountant/supervisor?id=5`,
        `${baseUrl}/api/accountant/supervisor?id=6`,
        `${baseUrl}/api/accountant/supervisor?id=7`,
        `${baseUrl}/api/accountant/supervisor?id=8`
      ],
      authHeader,
      isParangOfficeAllowedSupervisor
    );
  }

  const staticParangMap = {
    "parang-spvr-rodelito": "PARANG-SPVR-RODELITO",
    "parang-spvr-rodelito@gfldn": "PARANG-SPVR-RODELITO",
    "spvr-rodelito": "PARANG-SPVR-RODELITO",
    "rodelito": "PARANG-SPVR-RODELITO",

    "parang-spvr-reymark": "PARANG-SPVR-REYMARK",
    "parang-spvr-reymark@gfldn": "PARANG-SPVR-REYMARK",
    "spvr-reymark": "PARANG-SPVR-REYMARK",
    "reymark": "PARANG-SPVR-REYMARK",

    "parang-spvr-jonathan": "PARANG-SPVR-JONATHAN",
    "parang-spvr-jonathan@gfldn": "PARANG-SPVR-JONATHAN",
    "spvr-jonathan": "PARANG-SPVR-JONATHAN",
    "jonathan": "PARANG-SPVR-JONATHAN"
  };

  const result = { ...staticParangMap, ...dynamicMap };
  supervisorCache.set(cacheKey, result);
  return result;
}

// ─── N-KABUNTALAN SUB OFFICE SUPERVISORS ──────────────────────────────────────

/**
 * Fetch supervisors for N-KABUNTALAN SUB OFFICE.
 * Strictly fetches/allows only: NKABUNTALAN-SPVR-ROWEL.
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchNKabuntalanOfficeSupervisors(gatewayEndpoints = []) {
  const cacheKey = 'NKABUNTALAN_OFFICE';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const eps = (gatewayEndpoints || []).filter(e => e && e.is_active !== false);
  const nkabuntalanEp = eps.find(e => {
    const sub = (e.sub_office || e.name || '').toLowerCase();
    const url = (e.baseUrl || '').toLowerCase();
    return sub.includes('kabuntalan') || url.includes('kabuntalan');
  });

  let dynamicMap = {};
  if (nkabuntalanEp && nkabuntalanEp.baseUrl && nkabuntalanEp.token) {
    const authHeader = nkabuntalanEp.token.startsWith('Bearer ') ? nkabuntalanEp.token : `Bearer ${nkabuntalanEp.token}`;
    const baseUrl = nkabuntalanEp.baseUrl.replace(/\/+$/, '');
    dynamicMap = await fetchSupervisorsFromUrls(
      [
        `${baseUrl}/api/accountant/supervisor`,
        `${baseUrl}/api/accountant/supervisor?id=1`,
        `${baseUrl}/api/accountant/supervisor?id=2`,
        `${baseUrl}/api/accountant/supervisor?id=3`,
        `${baseUrl}/api/accountant/supervisor?id=4`,
        `${baseUrl}/api/accountant/supervisor?id=5`,
        `${baseUrl}/api/accountant/supervisor?id=6`,
        `${baseUrl}/api/accountant/supervisor?id=7`,
        `${baseUrl}/api/accountant/supervisor?id=8`
      ],
      authHeader,
      isNKabuntalanOfficeAllowedSupervisor
    );
  }

  const staticNKabuntalanMap = {
    "nkabuntalan-spvr-rowel": "NKABUNTALAN-SPVR-ROWEL",
    "nkabuntalan-spvr-rowel@gfldn": "NKABUNTALAN-SPVR-ROWEL",
    "n-kabuntalan-spvr-rowel": "NKABUNTALAN-SPVR-ROWEL",
    "n-kabuntalan-spvr-rowel@gfldn": "NKABUNTALAN-SPVR-ROWEL",
    "spvr-rowel": "NKABUNTALAN-SPVR-ROWEL",
    "rowel": "NKABUNTALAN-SPVR-ROWEL"
  };

  const result = { ...staticNKabuntalanMap, ...dynamicMap };
  supervisorCache.set(cacheKey, result);
  return result;
}

// ─── NORTH UPI SUB OFFICE SUPERVISORS ────────────────────────────────────────

/**
 * Fetch supervisors for NORTH UPI SUB OFFICE.
 * Strictly fetches/allows only: Joevert, Livelo, Armando, Wilboren, Pasawiran, Kinimi-Ago, Ago, Mosher/Bai, Ken, Galinato, Cedric.
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchNorthUpiOfficeSupervisors(gatewayEndpoints = []) {
  const cacheKey = 'NORTH_UPI_OFFICE';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const eps = (gatewayEndpoints || []).filter(e => e && e.is_active !== false);
  const upiEp = eps.find(e => {
    const sub = (e.sub_office || e.name || '').toLowerCase();
    const url = (e.baseUrl || '').toLowerCase();
    return sub.includes('upi') || url.includes('upi');
  });

  let dynamicMap = {};
  if (upiEp && upiEp.baseUrl && upiEp.token) {
    const authHeader = upiEp.token.startsWith('Bearer ') ? upiEp.token : `Bearer ${upiEp.token}`;
    const baseUrl = upiEp.baseUrl.replace(/\/+$/, '');
    dynamicMap = await fetchSupervisorsFromUrls(
      [
        `${baseUrl}/api/accountant/supervisor`,
        `${baseUrl}/api/accountant/supervisor?id=1`,
        `${baseUrl}/api/accountant/supervisor?id=2`,
        `${baseUrl}/api/accountant/supervisor?id=3`,
        `${baseUrl}/api/accountant/supervisor?id=4`,
        `${baseUrl}/api/accountant/supervisor?id=5`,
        `${baseUrl}/api/accountant/supervisor?id=6`,
        `${baseUrl}/api/accountant/supervisor?id=7`,
        `${baseUrl}/api/accountant/supervisor?id=8`
      ],
      authHeader,
      isNorthUpiOfficeAllowedSupervisor
    );
  }

  const staticNorthUpiMap = {
    "upi-spvr-joevert": "UPI-SPVR-JOEVERT",
    "upi-spvr-joevert@gfldn": "UPI-SPVR-JOEVERT",
    "spvr-joevert": "UPI-SPVR-JOEVERT",
    "joevert": "UPI-SPVR-JOEVERT",

    "upi-spvr-livelo": "UPI-SPVR-LIVELO",
    "upi-spvr-livelo@gfldn": "UPI-SPVR-LIVELO",
    "spvr-livelo": "UPI-SPVR-LIVELO",
    "livelo": "UPI-SPVR-LIVELO",

    "upi-spvr-armando": "UPI-SPVR-ARMANDO",
    "upi-spvr-armando@gfldn": "UPI-SPVR-ARMANDO",
    "spvr-armando": "UPI-SPVR-ARMANDO",
    "armando": "UPI-SPVR-ARMANDO",

    "upi-spvr-wilboren": "UPI-SPVR-WILBOREN",
    "upi-spvr-wilboren@gfldn": "UPI-SPVR-WILBOREN",
    "spvr-wilboren": "UPI-SPVR-WILBOREN",
    "wilboren": "UPI-SPVR-WILBOREN",

    "upi-spvr-pasawiran": "UPI-SPVR-PASAWIRAN",
    "upi-spvr-pasawiran@gfldn": "UPI-SPVR-PASAWIRAN",
    "spvr-pasawiran": "UPI-SPVR-PASAWIRAN",
    "pasawiran": "UPI-SPVR-PASAWIRAN",

    "dbs-spvr-kinimi-ago": "DBS-SPVR-KINIMI-AGO",
    "dbs-spvr-kinimi-ago@gfldn": "DBS-SPVR-KINIMI-AGO",
    "spvr-kinimi-ago": "DBS-SPVR-KINIMI-AGO",
    "kinimi-ago": "DBS-SPVR-KINIMI-AGO",

    "dbs-spvr-ago": "DBS-SPVR-AGO",
    "dbs-spvr-ago@gfldn": "DBS-SPVR-AGO",
    "spvr-ago": "DBS-SPVR-AGO",
    "ago": "DBS-SPVR-AGO",

    "upi-spvr-mosher/bai": "UPI-SPVR-MOSHER/BAI",
    "upi-spvr-mosher/bai@gfldn": "UPI-SPVR-MOSHER/BAI",
    "upi-spvr-mosher-bai": "UPI-SPVR-MOSHER/BAI",
    "upi-spvr-mosher-bai@gfldn": "UPI-SPVR-MOSHER/BAI",
    "upi-spvr-mosher": "UPI-SPVR-MOSHER/BAI",
    "spvr-mosher": "UPI-SPVR-MOSHER/BAI",
    "mosher/bai": "UPI-SPVR-MOSHER/BAI",
    "mosher-bai": "UPI-SPVR-MOSHER/BAI",
    "mosher": "UPI-SPVR-MOSHER/BAI",

    "upi-spvr-ken": "UPI-SPVR-KEN",
    "upi-spvr-ken@gfldn": "UPI-SPVR-KEN",
    "spvr-ken": "UPI-SPVR-KEN",
    "ken": "UPI-SPVR-KEN",

    "upi-spvr-galinato": "UPI-SPVR-GALINATO",
    "upi-spvr-galinato@gfldn": "UPI-SPVR-GALINATO",
    "spvr-galinato": "UPI-SPVR-GALINATO",
    "galinato": "UPI-SPVR-GALINATO",

    "upi-spvr-cedric": "UPI-SPVR-CEDRIC",
    "upi-spvr-cedric@gfldn": "UPI-SPVR-CEDRIC",
    "spvr-cedric": "UPI-SPVR-CEDRIC",
    "cedric": "UPI-SPVR-CEDRIC"
  };

  const result = { ...staticNorthUpiMap, ...dynamicMap };
  supervisorCache.set(cacheKey, result);
  return result;
}

// ─── SOUTH UPI SUB OFFICE SUPERVISORS ────────────────────────────────────────

/**
 * Fetch supervisors for SOUTH UPI SUB OFFICE.
 * Strictly fetches/allows only: Guiamad, Asrap, Valdez, Lu, Roland, Mark, Rommel.
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchSouthUpiOfficeSupervisors(gatewayEndpoints = []) {
  const cacheKey = 'SOUTH_UPI_OFFICE';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const eps = (gatewayEndpoints || []).filter(e => e && e.is_active !== false);
  const southUpiEp = eps.find(e => {
    const sub = (e.sub_office || e.name || '').toLowerCase();
    const url = (e.baseUrl || '').toLowerCase();
    const isSouth = sub.includes('south') || url.includes('south');
    const isUpi = sub.includes('upi') || url.includes('upi');
    return isSouth && isUpi;
  });

  let dynamicMap = {};
  if (southUpiEp && southUpiEp.baseUrl && southUpiEp.token) {
    const authHeader = southUpiEp.token.startsWith('Bearer ') ? southUpiEp.token : `Bearer ${southUpiEp.token}`;
    const baseUrl = southUpiEp.baseUrl.replace(/\/+$/, '');
    dynamicMap = await fetchSupervisorsFromUrls(
      [
        `${baseUrl}/api/accountant/supervisor`,
        `${baseUrl}/api/accountant/supervisor?id=1`,
        `${baseUrl}/api/accountant/supervisor?id=2`,
        `${baseUrl}/api/accountant/supervisor?id=3`,
        `${baseUrl}/api/accountant/supervisor?id=4`,
        `${baseUrl}/api/accountant/supervisor?id=5`,
        `${baseUrl}/api/accountant/supervisor?id=6`,
        `${baseUrl}/api/accountant/supervisor?id=7`,
        `${baseUrl}/api/accountant/supervisor?id=8`
      ],
      authHeader,
      isSouthUpiOfficeAllowedSupervisor
    );
  }

  const staticSouthUpiMap = {
    "upi-spvr-guiamad": "UPI-SPVR-GUIAMAD",
    "upi-spvr-guiamad@gfldn": "UPI-SPVR-GUIAMAD",
    "southupi-spvr-guiamad": "UPI-SPVR-GUIAMAD",
    "spvr-guiamad": "UPI-SPVR-GUIAMAD",
    "guiamad": "UPI-SPVR-GUIAMAD",

    "southupi-spvr-asrap": "SOUTHUPI-SPVR-ASRAP",
    "southupi-spvr-asrap@gfldn": "SOUTHUPI-SPVR-ASRAP",
    "upi-spvr-asrap": "SOUTHUPI-SPVR-ASRAP",
    "spvr-asrap": "SOUTHUPI-SPVR-ASRAP",
    "asrap": "SOUTHUPI-SPVR-ASRAP",

    "spvr-valdez-southupi": "SPVR-VALDEZ-SOUTHUPI",
    "spvr-valdez-southupi@gfldn": "SPVR-VALDEZ-SOUTHUPI",
    "southupi-spvr-valdez": "SPVR-VALDEZ-SOUTHUPI",
    "valdez-southupi": "SPVR-VALDEZ-SOUTHUPI",
    "spvr-valdez": "SPVR-VALDEZ-SOUTHUPI",
    "valdez": "SPVR-VALDEZ-SOUTHUPI",

    "southupi-spvr-lu": "SOUTHUPI-SPVR-LU",
    "southupi-spvr-lu@gfldn": "SOUTHUPI-SPVR-LU",
    "upi-spvr-lu": "SOUTHUPI-SPVR-LU",
    "spvr-lu": "SOUTHUPI-SPVR-LU",
    "lu": "SOUTHUPI-SPVR-LU",

    "southupi-spvr-roland": "SOUTHUPI-SPVR-ROLAND",
    "southupi-spvr-roland@gfldn": "SOUTHUPI-SPVR-ROLAND",
    "upi-spvr-roland": "SOUTHUPI-SPVR-ROLAND",
    "spvr-roland": "SOUTHUPI-SPVR-ROLAND",
    "roland": "SOUTHUPI-SPVR-ROLAND",

    "southupi-spvr-mark": "SOUTHUPI-SPVR-MARK",
    "southupi-spvr-mark@gfldn": "SOUTHUPI-SPVR-MARK",
    "upi-spvr-mark": "SOUTHUPI-SPVR-MARK",
    "spvr-mark": "SOUTHUPI-SPVR-MARK",
    "mark": "SOUTHUPI-SPVR-MARK",

    "southupi-spvr-rommel": "SOUTHUPI-SPVR-ROMMEL",
    "southupi-spvr-rommel@gfldn": "SOUTHUPI-SPVR-ROMMEL",
    "upi-spvr-rommel": "SOUTHUPI-SPVR-ROMMEL",
    "spvr-rommel": "SOUTHUPI-SPVR-ROMMEL",
    "rommel": "SOUTHUPI-SPVR-ROMMEL"
  };

  const result = { ...staticSouthUpiMap, ...dynamicMap };
  supervisorCache.set(cacheKey, result);
  return result;
}

/**
 * Fetches supervisors for DOS/AWANG OFFICE.
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchDosAwangOfficeSupervisors(gatewayEndpoints = []) {
  const cacheKey = 'DOS_AWANG_OFFICE';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  const eps = (gatewayEndpoints || []).filter(e => e && e.is_active !== false);
  const dosAwangEp = eps.find(e => {
    const sub = (e.sub_office || e.name || '').toLowerCase();
    const url = (e.baseUrl || '').toLowerCase();
    return sub.includes('awang') || sub.includes('dos') || url.includes('awang') || url.includes('dos');
  });

  let dynamicMap = {};
  if (dosAwangEp && dosAwangEp.baseUrl && dosAwangEp.token) {
    const authHeader = dosAwangEp.token.startsWith('Bearer ') ? dosAwangEp.token : `Bearer ${dosAwangEp.token}`;
    const baseUrl = dosAwangEp.baseUrl.replace(/\/+$/, '');
    dynamicMap = await fetchSupervisorsFromUrls(
      [
        `${baseUrl}/api/accountant/supervisor`,
        `${baseUrl}/api/accountant/supervisor?id=1`,
        `${baseUrl}/api/accountant/supervisor?id=2`,
        `${baseUrl}/api/accountant/supervisor?id=3`,
        `${baseUrl}/api/accountant/supervisor?id=4`,
        `${baseUrl}/api/accountant/supervisor?id=5`,
        `${baseUrl}/api/accountant/supervisor?id=6`,
        `${baseUrl}/api/accountant/supervisor?id=7`,
        `${baseUrl}/api/accountant/supervisor?id=8`
      ],
      authHeader,
      isDosAwangOfficeAllowedSupervisor
    );
  }

  const staticDosAwangMap = {
    "dos/awang-spvr-ramsie": "DOS/AWANG-SPVR-RAMSIE",
    "dos-awang-spvr-ramsie": "DOS/AWANG-SPVR-RAMSIE",
    "dos/awang-spvr-ramsie@gfldn": "DOS/AWANG-SPVR-RAMSIE",
    "dos-awang-spvr-ramsie@gfldn": "DOS/AWANG-SPVR-RAMSIE",
    "spvr-ramsie": "DOS/AWANG-SPVR-RAMSIE",
    "ramsie": "DOS/AWANG-SPVR-RAMSIE",

    "dos/awang-spvr-lorenzo": "DOS/AWANG-SPVR-LORENZO",
    "dos-awang-spvr-lorenzo": "DOS/AWANG-SPVR-LORENZO",
    "dos/awang-spvr-lorenzo@gfldn": "DOS/AWANG-SPVR-LORENZO",
    "dos-awang-spvr-lorenzo@gfldn": "DOS/AWANG-SPVR-LORENZO",
    "spvr-lorenzo": "DOS/AWANG-SPVR-LORENZO",
    "lorenzo": "DOS/AWANG-SPVR-LORENZO",

    "dos/awang-spvr-jonny": "DOS/AWANG-SPVR-JONNY",
    "dos-awang-spvr-jonny": "DOS/AWANG-SPVR-JONNY",
    "dos/awang-spvr-jonny@gfldn": "DOS/AWANG-SPVR-JONNY",
    "dos-awang-spvr-jonny@gfldn": "DOS/AWANG-SPVR-JONNY",
    "dos/awang-spvr-johnny": "DOS/AWANG-SPVR-JONNY",
    "dos-awang-spvr-johnny": "DOS/AWANG-SPVR-JONNY",
    "spvr-jonny": "DOS/AWANG-SPVR-JONNY",
    "spvr-johnny": "DOS/AWANG-SPVR-JONNY",
    "jonny": "DOS/AWANG-SPVR-JONNY",
    "johnny": "DOS/AWANG-SPVR-JONNY",

    "dos/awang-spvr-marlon": "DOS/AWANG-SPVR-MARLON",
    "dos-awang-spvr-marlon": "DOS/AWANG-SPVR-MARLON",
    "dos/awang-spvr-marlon@gfldn": "DOS/AWANG-SPVR-MARLON",
    "dos-awang-spvr-marlon@gfldn": "DOS/AWANG-SPVR-MARLON",
    "spvr-marlon": "DOS/AWANG-SPVR-MARLON",

    "dos/awang-spvr-harif": "DOS/AWANG-SPVR-HARIF",
    "dos-awang-spvr-harif": "DOS/AWANG-SPVR-HARIF",
    "dos/awang-spvr-harif@gfldn": "DOS/AWANG-SPVR-HARIF",
    "dos-awang-spvr-harif@gfldn": "DOS/AWANG-SPVR-HARIF",
    "spvr-harif": "DOS/AWANG-SPVR-HARIF",
    "harif": "DOS/AWANG-SPVR-HARIF"
  };

  const result = { ...staticDosAwangMap, ...dynamicMap };
  supervisorCache.set(cacheKey, result);
  return result;
}

/**
 * Fetch all supervisors (Mandaue + SET A + SET B + LALA + BALOI + LANDASAN + PARANG + N-KABUNTALAN + NORTH UPI + SOUTH UPI + DOS/AWANG) merged into one map.
 * @param {Array} gatewayEndpoints
 * @returns {Promise<Object>}
 */
export async function fetchAllIliganSupervisors(gatewayEndpoints = []) {
  const cacheKey = 'ALL_SUPERVISORS';
  if (supervisorCache.has(cacheKey)) return supervisorCache.get(cacheKey);

  if (inFlightPromises.has(cacheKey)) {
    return inFlightPromises.get(cacheKey);
  }

  const promise = (async () => {
    try {
      const [mandaue, setA, setB, lala, baloi, landasan, parang, nkabuntalan, northUpi, southUpi, dosAwang] = await Promise.all([
        fetchMandaueSupervisors(gatewayEndpoints),
        fetchIliganSetASupervisors(gatewayEndpoints),
        fetchIliganSupervisors(gatewayEndpoints),
        fetchLalaOfficeSupervisors(gatewayEndpoints),
        fetchBaloiOfficeSupervisors(gatewayEndpoints),
        fetchLandasanOfficeSupervisors(gatewayEndpoints),
        fetchParangOfficeSupervisors(gatewayEndpoints),
        fetchNKabuntalanOfficeSupervisors(gatewayEndpoints),
        fetchNorthUpiOfficeSupervisors(gatewayEndpoints),
        fetchSouthUpiOfficeSupervisors(gatewayEndpoints),
        fetchDosAwangOfficeSupervisors(gatewayEndpoints)
      ]);
      const merged = { ...mandaue, ...setB, ...setA, ...lala, ...baloi, ...landasan, ...parang, ...nkabuntalan, ...northUpi, ...southUpi, ...dosAwang };
      supervisorCache.set(cacheKey, merged);
      return merged;
    } finally {
      inFlightPromises.delete(cacheKey);
    }
  })();

  inFlightPromises.set(cacheKey, promise);
  return promise;
}

// ─── Display Name Resolution ──────────────────────────────────────────────────

/**
 * Resolve display name for a supervisor key
 * @param {string} key - Supervisor username, ID, or handle
 * @param {Object} dynamicMap - Fetched supervisor dictionary
 * @returns {string}
 */
export function resolveSupervisorDisplayName(key, dynamicMap = {}) {
  if (!key) return 'N/A';
  const cleanKey = String(key).trim().toLowerCase();
  const prefix = cleanKey.split('@')[0];

  if (dynamicMap && dynamicMap[cleanKey]) return dynamicMap[cleanKey];
  if (dynamicMap && dynamicMap[prefix]) return dynamicMap[prefix];
  if (DEFAULT_SUPERVISOR_NAMES[cleanKey]) return DEFAULT_SUPERVISOR_NAMES[cleanKey];
  if (DEFAULT_SUPERVISOR_NAMES[prefix]) return DEFAULT_SUPERVISOR_NAMES[prefix];
  return String(key).toUpperCase();
}
